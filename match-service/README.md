# Match Service

This is a standalone C++ HTTP microservice. It is independent of the Next.js application and exposes `POST /match` on port `8080`.

## Compile and run

From the repository root on Windows with `g++`:

```powershell
g++ -std=c++17 -O2 -Wall -Wextra -I match-service/include match-service/main.cpp -o match-service/match_service.exe -lws2_32
.\match-service\match_service.exe
```

The `-std=c++17` flag enables the C++17 language features used by the service. `-O2` optimizes the executable, `-Wall -Wextra` enables useful compiler warnings, and `-I match-service/include` tells the compiler where the vendored single-header libraries are located. `-lws2_32` links Windows socket support required by cpp-httplib.

## Matching algorithm

1. Each input skill is trimmed at both ends and converted to lowercase. Empty normalized values are ignored.
2. The normalized candidate and required skills are stored in `std::set<std::string>`. A set removes duplicates and keeps values sorted.
3. `std::set_intersection` compares both sorted sets and inserts skills present in both into `matchedSkills`.
4. `std::set_difference` compares required skills against candidate skills and inserts required skills that are absent from the candidate into `missingSkills`.
5. The percentage is `matched count / required count * 100`. A zero-required-skills request returns `Low` to avoid division by zero.
6. Scores above 70 are `Strong`, scores from 40 through 70 are `Partial`, and scores below 40 are `Low`.

Example request:

```json
{
  "candidateSkills": [" React ", "JavaScript", "CSS"],
  "jobRequiredSkills": ["react", "typescript", "css", "node"]
}
```

Example response:

```json
{
  "matchScore": "Partial",
  "matchedSkills": ["css", "react"],
  "missingSkills": ["node", "typescript"]
}
```