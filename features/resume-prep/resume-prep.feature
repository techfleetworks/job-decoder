@audience:job-seeker
Feature: Prepare your application from the hats
  As a job seeker
  I want grounded prep after a decode
  So I can act on it without guessing and without giving up any personal data (T16, ADR-0024)

  @usecase:prep-skills @category:happy @quality:functional @severity:high
  Scenario: Resume skills are split and the hidden hat comes first
    Given a decoded posting with matched, hidden, and non-standard hats
    When the prep guide is built
    Then technical and interpersonal skills are listed separately, each tied to a hat
    And the cover letter points lead with the hidden hat

  @usecase:prep-outcomes @category:happy @quality:functional @severity:medium
  Scenario: Each activity has an outcome template with blanks and no made-up numbers
    Given a decoded posting with matched, hidden, and non-standard hats
    When the prep guide is built
    Then a matched activity has an action, result, and impact template with blanks to fill

  @usecase:prep-ats-dedup @category:boundary @quality:functional @severity:medium
  Scenario: An ATS keyword appears only once
    Given a decoded posting with matched, hidden, and non-standard hats
    When the prep guide is built
    Then every ATS keyword appears once across the groups

  @usecase:prep-empty-set @category:empty-overflow @quality:functional @severity:medium
  Scenario: A posting with no non-standard hats has no extra-scope items
    Given a decoded posting with no non-standard hats
    When the prep guide is built
    Then no interview point is for a non-standard hat

  @usecase:prep-not-covered @category:negative @quality:functional @severity:high
  Scenario: An uncovered title gets no prep guide
    Given a decode for a title the framework does not cover
    When the prep guide is built
    Then there is no prep guide

  @usecase:prep-traceable @category:happy @quality:functional @severity:high
  Scenario: Every prep item traces to a hat
    Given a decoded posting with matched, hidden, and non-standard hats
    When the prep guide is built
    Then every skill, activity, and deliverable names the hat it came from
