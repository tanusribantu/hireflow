#include "httplib.h"
#include "json.hpp"

#include <algorithm>
#include <cctype>
#include <iostream>
#include <map>
#include <string>
#include <vector>

using json = nlohmann::json;

std::string normalizeText(const std::string& value) {
    std::string trimmed = value;
    while (!trimmed.empty() && std::isspace(static_cast<unsigned char>(trimmed.front()))) {
        trimmed.erase(trimmed.begin());
    }
    while (!trimmed.empty() && std::isspace(static_cast<unsigned char>(trimmed.back()))) {
        trimmed.pop_back();
    }

    std::transform(trimmed.begin(), trimmed.end(), trimmed.begin(), [](unsigned char character) {
        return static_cast<char>(std::tolower(character));
    });
    return trimmed;
}

std::string normalizeTier(const std::string& tier) {
    const std::string normalized = normalizeText(tier);
    if (normalized == "quiz verified" || normalized == "quiz-verified" || normalized == "quiz_verified") {
        return "quiz-verified";
    }
    if (normalized == "project backed" || normalized == "project-backed" || normalized == "project_backed") {
        return "project-backed";
    }
    return "self-reported";
}

std::string normalizeImportance(const std::string& importance) {
    const std::string normalized = normalizeText(importance);
    if (normalized == "must have" || normalized == "must-have" || normalized == "must_have") {
        return "must-have";
    }
    return "nice-to-have";
}

int evidenceWeight(const std::string& evidenceTier) {
    if (evidenceTier == "quiz-verified") {
        return 3;
    }
    if (evidenceTier == "project-backed") {
        return 2;
    }
    return 1;
}

int importanceWeight(const std::string& importance) {
    return importance == "must-have" ? 3 : 1;
}

std::string scoreBucket(double weightedScore) {
    if (weightedScore > 70.0) {
        return "Strong";
    }
    if (weightedScore >= 40.0) {
        return "Partial";
    }
    return "Low";
}

json readCandidateSkill(const json& item) {
    if (item.is_string()) {
        return {
            {"skill", normalizeText(item.get<std::string>())},
            {"evidenceTier", "self-reported"}
        };
    }
    if (item.is_object()) {
        std::string skill = item.contains("skill") ? item["skill"].get<std::string>() : "";
        std::string evidenceTier = item.contains("evidenceTier") ? item["evidenceTier"].get<std::string>() : "self-reported";
        if (!skill.empty()) {
            return {
                {"skill", normalizeText(skill)},
                {"evidenceTier", normalizeTier(evidenceTier)}
            };
        }
    }
    return json::object();
}

json readRequiredSkill(const json& item) {
    if (item.is_string()) {
        return {
            {"skill", normalizeText(item.get<std::string>())},
            {"importance", "nice-to-have"}
        };
    }
    if (item.is_object()) {
        std::string skill = item.contains("skill") ? item["skill"].get<std::string>() : "";
        std::string importance = item.contains("importance") ? item["importance"].get<std::string>() : "nice-to-have";
        if (!skill.empty()) {
            return {
                {"skill", normalizeText(skill)},
                {"importance", normalizeImportance(importance)}
            };
        }
    }
    return json::object();
}

int main() {
    httplib::Server server;

    server.Post("/match", [](const httplib::Request& request, httplib::Response& response) {
        try {
            const json body = json::parse(request.body);
            if (!body.contains("candidateSkills") || !body.contains("jobRequiredSkills") ||
                !body["candidateSkills"].is_array() || !body["jobRequiredSkills"].is_array()) {
                response.status = 400;
                response.set_content(R"({"error":"candidateSkills and jobRequiredSkills must be arrays"})", "application/json");
                return;
            }

            std::map<std::string, std::string> bestEvidence;
            for (const auto& candidateSkill : body["candidateSkills"]) {
                const json parsedSkill = readCandidateSkill(candidateSkill);
                if (parsedSkill.empty()) {
                    response.status = 400;
                    response.set_content(R"({"error":"candidateSkills entries must be strings or objects with skill and evidenceTier"})", "application/json");
                    return;
                }
                const std::string normalizedSkill = parsedSkill["skill"].get<std::string>();
                const std::string evidenceTier = parsedSkill["evidenceTier"].get<std::string>();
                if (normalizedSkill.empty()) {
                    response.status = 400;
                    response.set_content(R"({"error":"candidate skill name cannot be empty"})", "application/json");
                    return;
                }
                if (!bestEvidence.count(normalizedSkill) || evidenceWeight(evidenceTier) > evidenceWeight(bestEvidence[normalizedSkill])) {
                    bestEvidence[normalizedSkill] = evidenceTier;
                }
            }

            std::map<std::string, std::string> requiredImportance;
            for (const auto& requiredSkill : body["jobRequiredSkills"]) {
                const json parsedSkill = readRequiredSkill(requiredSkill);
                if (parsedSkill.empty()) {
                    response.status = 400;
                    response.set_content(R"({"error":"jobRequiredSkills entries must be strings or objects with skill and importance"})", "application/json");
                    return;
                }
                const std::string normalizedSkill = parsedSkill["skill"].get<std::string>();
                const std::string importance = parsedSkill["importance"].get<std::string>();
                if (normalizedSkill.empty()) {
                    response.status = 400;
                    response.set_content(R"({"error":"required skill name cannot be empty"})", "application/json");
                    return;
                }
                if (!requiredImportance.count(normalizedSkill) || importanceWeight(importance) > importanceWeight(requiredImportance[normalizedSkill])) {
                    requiredImportance[normalizedSkill] = importance;
                }
            }

            double matchedContributionTotal = 0.0;
            double maxPossibleScore = 0.0;
            json matchedSkills = json::array();
            json missingSkills = json::array();

            for (const auto& [skillName, importance] : requiredImportance) {
                maxPossibleScore += 3.0 * static_cast<double>(importanceWeight(importance));
                if (bestEvidence.count(skillName)) {
                    const std::string evidenceTier = bestEvidence[skillName];
                    const double contribution = static_cast<double>(evidenceWeight(evidenceTier)) * static_cast<double>(importanceWeight(importance));
                    matchedContributionTotal += contribution;
                    matchedSkills.push_back({
                        {"skill", skillName},
                        {"evidenceTier", evidenceTier}
                    });
                } else {
                    missingSkills.push_back({
                        {"skill", skillName},
                        {"importance", importance}
                    });
                }
            }

            const double percentage = maxPossibleScore > 0.0
                ? (matchedContributionTotal / maxPossibleScore) * 100.0
                : 0.0;

            json result = {
                {"matchScore", scoreBucket(percentage)},
                {"matchedSkills", matchedSkills},
                {"missingSkills", missingSkills}
            };
            response.set_content(result.dump(), "application/json");
        } catch (const json::exception&) {
            response.status = 400;
            response.set_content(R"({"error":"invalid JSON body"})", "application/json");
        }
    });

    std::cout << "Match service listening on http://localhost:8080" << std::endl;
    if (!server.listen("0.0.0.0", 8080)) {
        std::cerr << "Could not start server on port 8080" << std::endl;
        return 1;
    }
    return 0;
}