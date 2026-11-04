@audience:job-seeker
Feature: The decode endpoint rate-limits each client
  As the service
  I want a per-client cap on decodes within a time window
  So a flood of requests cannot exhaust the decode and LLM capacity (owasp Denial of Service, ADR-0043)

  @security @owasp:denial-of-service @usecase:decode-rate-limit @category:boundary @quality:security @severity:high
  Scenario: A client past the per-window decode limit is turned away
    Given a client that has used its full decode allowance in the window
    When the client makes one more decode request
    Then the request is rejected as rate-limited
    And a different client still within its allowance is allowed
