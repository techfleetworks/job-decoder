@audience:job-seeker
Feature: The decode endpoint validates untrusted input before any work (T13)
  As the service
  I want every decode request checked against server-side rules first
  So malformed or oversized input never reaches the matcher (owasp Input Validation, ADR-0035)

  @security @owasp:denial-of-service @usecase:decode-input-oversized @category:boundary @quality:security @severity:high
  Scenario: An oversized posting is rejected before any decoding runs
    Given a decode request whose posting is longer than the allowed limit
    When the input is validated
    Then it is rejected as too large
    And no decoding is attempted

  @security @owasp:input-validation @usecase:decode-input-wrong-type @category:negative @quality:security @severity:high
  Scenario: A non-text posting is rejected
    Given a decode request whose posting is a number, not text
    When the input is validated
    Then it is rejected as invalid

  @security @owasp:input-validation @usecase:decode-input-not-object @category:adverse @quality:security @severity:medium
  Scenario: A body that is not a JSON object is rejected
    Given a decode request whose body is a bare array
    When the input is validated
    Then it is rejected as invalid

  @security @owasp:input-validation @usecase:decode-input-empty @category:empty-overflow @quality:security @severity:medium
  Scenario: A blank posting is rejected
    Given a decode request whose posting is only whitespace
    When the input is validated
    Then it is rejected as invalid

  @security @owasp:mass-assignment @usecase:decode-input-extra-fields @category:adverse @quality:security @severity:medium
  Scenario: Extra fields on the request are ignored, not bound
    Given a decode request with a valid title and posting plus an unexpected admin field
    When the input is validated
    Then only the title and posting are accepted
