@audience:engineer
Feature: The architecture gate holds the tier boundaries
  As the engineering team
  I want the architecture gate to block tier violations
  So the three-tier boundaries hold from the first commit (T10, ADR-0006, ADR-0009)

  @usecase:gate-clean @category:happy @quality:functional @severity:high
  Scenario: The real source tree passes the gate
    When the architecture gate runs on the project
    Then it passes

  @usecase:gate-secret @category:permission @quality:security @severity:critical
  Scenario: A server-only secret in client code is blocked
    Given a client file that reads a server-only secret
    When the architecture gate runs
    Then it fails with the matching violation

  @usecase:gate-db-client @category:permission @quality:security @severity:critical
  Scenario: The database client in browser code is blocked
    Given a client file that imports the Supabase database client
    When the architecture gate runs
    Then it fails with the matching violation

  @usecase:gate-session-only @category:negative @quality:functional @severity:high
  Scenario: localStorage in client code is blocked
    Given a client file that uses localStorage
    When the architecture gate runs
    Then it fails with the matching violation

  @usecase:gate-literal-color @category:negative @quality:functional @severity:low
  Scenario: A hard-coded color in a component is blocked
    Given a component file with a hex color literal
    When the architecture gate runs
    Then it fails with the matching violation

  @usecase:gate-server-secret-ok @category:boundary @quality:security @severity:high
  Scenario: A secret in the server tier is allowed
    Given a server-tier route that reads a secret
    When the architecture gate runs
    Then it is allowed
