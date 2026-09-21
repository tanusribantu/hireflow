#include "httplib.h"
#include "json.hpp"

#include <algorithm>
#include <cctype>
#include <iostream>
#include <set>
#include <string>

using json = nlohmann::json;

std::string normalizeSkill(const std::string& skill) {
    auto first = std::find_if_not(skill.begin(), skill.end(), [](unsigned char character) {
        return std::isspace(character);
    });
    auto last = std::find_if_not(skill.rbegin(), skill.rend(), [](unsigned char character) {
        return std::isspace(character);
    }).base();

    if (first >= last) {
        return "";
    }

    std::string normalized(first, last);
    std::transform(normalized.begin(), normalized.end(), normalized.begin(), [](unsigned char character) {
        return static_cast<char>(std::tolower(character));
    });
    return normalized;
}

std::set<std::string> normalizeSkills(const json& skills) {
    std::set<std::string> normalizedSkills;
    for (const auto& skill : skills) {
        const std::string normalized = normalizeSkill(skill.get<std::string>());
        if (!normalized.empty()) {
            normalizedSkills.insert(normalized);
        }
    }
    return normalizedSkills;
}

std::string scoreBucket(std::size_t matchedCount, std::size_t requiredCount) {
    if (requiredCount == 0) {
        return "Low";
    }

    const double score = (static_cast<double>(matchedCount) / requiredCount) * 100.0;
    if (score > 70.0) {
        return "Strong";
    }
    if (score >= 40.0) {
        return "Partial";
    }
    return "Low";
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

            for (const auto& skill : body["candidateSkills"]) {
                if (!skill.is_string()) {
                    response.status = 400;
                    response.set_content(R"({"error":"skills must contain only strings"})", "application/json");
                    return;
                }
            }
            for (const auto& skill : body["jobRequiredSkills"]) {
                if (!skill.is_string()) {
                    response.status = 400;
                    response.set_content(R"({"error":"skills must contain only strings"})", "application/json");
                    return;
                }
            }

            const std::set<std::string> candidateSkills = normalizeSkills(body["candidateSkills"]);
            const std::set<std::string> requiredSkills = normalizeSkills(body["jobRequiredSkills"]);
            std::set<std::string> matchedSkills;
            std::set<std::string> missingSkills;

            std::set_intersection(
                candidateSkills.begin(), candidateSkills.end(),
                requiredSkills.begin(), requiredSkills.end(),
                std::inserter(matchedSkills, matchedSkills.begin()));
            std::set_difference(
                requiredSkills.begin(), requiredSkills.end(),
                candidateSkills.begin(), candidateSkills.end(),
                std::inserter(missingSkills, missingSkills.begin()));

            json result = {
                {"matchScore", scoreBucket(matchedSkills.size(), requiredSkills.size())},
                {"matchedSkills", matchedSkills},
                {"missingSkills", missingSkills},
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