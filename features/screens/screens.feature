@audience:job-seeker
Feature: The result screen speaks plainly
  As a job seeker
  I want the result worded clearly and honestly
  So I can trust what the posting does and does not ask for (T01, T02, T06, ADR-0013, ADR-0018)

  @usecase:screen-strong-headline @category:happy @quality:functional @severity:medium
  Scenario: A strong fit says so in plain words
    Given a strong-fit result
    When the result is summarized for the screen
    Then the headline says the posting fits the title well

  @usecase:screen-basic-read @category:boundary @quality:functional @severity:medium
  Scenario: A keyword-only result is labeled a basic read
    Given a keyword-only result with no AI step
    When the result is summarized for the screen
    Then it is labeled a basic read

  @usecase:screen-not-covered @category:negative @quality:functional @severity:high
  Scenario: An uncovered title is reported honestly with no percentage
    Given a result for a title the framework does not cover
    When the result is summarized for the screen
    Then the headline says the title is not covered
    And no match percentage is shown
