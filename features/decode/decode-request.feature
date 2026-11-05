@audience:job-seeker
Feature: The decode request tells working, cancelled, and failed apart
  As a job seeker
  I want the app's decode request handled honestly
  So a cancel is never shown as an error and a failure never looks like a cancel (T18, ADR-0044)

  @usecase:decode-request-ok @category:happy @quality:functional @severity:high
  Scenario: A successful request returns the decoded result
    Given the decode endpoint will return a decoded result
    When the posting is sent to the decoder
    Then the decoder returns a successful result

  @usecase:decode-request-cancel @category:negative @quality:reliability @severity:high
  Scenario: A cancelled request is surfaced as a cancel, not a failure
    Given the decode request is aborted in flight
    When the posting is sent to the decoder
    Then the request is surfaced as a cancel

  @usecase:decode-request-network-error @category:adverse @quality:reliability @severity:high
  Scenario: A network failure is surfaced as an error, not a cancel
    Given the decode endpoint cannot be reached
    When the posting is sent to the decoder
    Then the decoder reports a failure with the "error" reason

  @usecase:decode-request-rate-limited @category:boundary @quality:functional @severity:medium
  Scenario: A rate-limited request keeps its own reason so the right screen shows
    Given the decode endpoint responds with a 429 rate limit
    When the posting is sent to the decoder
    Then the decoder reports a failure with the "rate-limited" reason
