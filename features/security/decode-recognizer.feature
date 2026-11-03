@audience:job-seeker
Feature: The LLM recognizer cannot change the decode result (T03)
  As a job seeker
  I want the model to recognize wording only, never to decide
  So a wrong, hallucinated, or injected item can never reach my result (owasp, ADR-0037)

  @security @owasp:llm-prompt-injection @usecase:recognizer-injected-slug @category:adverse @quality:security @severity:critical
  Scenario: A posting that tries to inject an item it does not describe is ignored
    Given a framework with the wireframing activity
    And the model returns a slug that is not in the framework
    When the recognitions are validated
    Then no item is recognized
    And the rejected slug is recorded as not in the framework

  @security @owasp:input-validation @usecase:recognizer-fabricated-quote @category:negative @quality:security @severity:high
  Scenario: A recognition whose quote is not in the posting is dropped
    Given a framework with the wireframing activity
    And the model returns a real slug with a quote that is not in the posting
    When the recognitions are validated
    Then no item is recognized
    And the rejected slug is recorded as a non-verbatim quote

  @security @owasp:input-validation @usecase:recognizer-wrong-type @category:negative @quality:security @severity:high
  Scenario: A real slug returned under the wrong entity type is dropped
    Given a framework with the wireframing activity
    And the model returns the wireframing slug but calls it a tool
    When the recognitions are validated
    Then no item is recognized
    And the rejected slug is recorded as not in the framework

  @security @owasp:mass-assignment @usecase:recognizer-extra-fields @category:adverse @quality:security @severity:medium
  Scenario: Extra fields the model returns on an item cannot bind
    Given a framework with the wireframing activity
    And the model returns a valid item carrying extra forged fields
    When the recognitions are validated
    Then the item is recognized with only its framework-owned fields

  @security @owasp:error-handling @usecase:recognizer-garbled-output @category:error @quality:reliability @severity:medium
  Scenario: Garbled model output yields no matches instead of an error
    Given a framework with the wireframing activity
    And the model returns prose instead of JSON
    When the recognitions are validated
    Then no item is recognized
    And the decode can still fall back to the keyword-only read
