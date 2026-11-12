@audience:job-seeker
Feature: Decode a job posting into the hats it expects
  As a job seeker
  I want a posting read against the framework
  So I can see which role duties it covers, misses, and adds (T03 to T09, ADR-0018)

  @usecase:decode-covered @category:happy @quality:functional @severity:high
  Scenario: A covered title with matching work reads as a strong fit
    Given the title "UX Designer" and a posting that names wireframing and user research
    When the posting is decoded
    Then both standard hats are covered
    And the title-fit verdict is "strong"

  @usecase:decode-missing @category:boundary @quality:functional @severity:high
  Scenario: An expected hat that is not named is reported as missing
    Given the title "UX Designer" and a posting that names only wireframing
    When the posting is decoded
    Then the research hat is reported as missing
    And the title-fit verdict is "partial"

  @usecase:decode-non-standard @category:adverse @quality:functional @severity:medium
  Scenario: Work the title does not normally cover is shown as non-standard
    Given the title "UX Designer" and a posting that also names a product roadmap
    When the posting is decoded
    Then a non-standard hat is reported with its name

  @usecase:decode-not-covered @category:negative @quality:functional @severity:high
  Scenario: An unknown title is reported as not covered, never guessed
    Given the title "Astronaut" and any posting
    When the posting is decoded
    Then the result is "not-covered"
    And no hats are covered

  @usecase:decode-line-audit @category:happy @quality:reliability @severity:medium
  Scenario: Every posting line is accounted for
    Given the title "UX Designer" and a posting with a matching line and an unrelated line
    When the posting is decoded
    Then every line is either matched or unplaced

  @usecase:decode-meaning-confirm @category:adverse @quality:functional @severity:high
  Scenario: A keyword match the recognizer does not confirm is flagged unconfirmed
    Given the title "UX Designer" and a posting naming wireframing and user research, with the recognizer confirming only user research
    When the posting is decoded
    Then the "Wireframing" match is unconfirmed
    And the "User Research" match is confirmed
