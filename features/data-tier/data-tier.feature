@audience:engineer
Feature: The framework data tier and snapshot build
  As the engineering team
  I want the framework stored as versioned data and served as a built snapshot
  So reads are cheap and bad data can never reach a user (T11, ADR-0022, ADR-0008)

  @usecase:snapshot-build @category:happy @quality:functional @severity:high
  Scenario: The pinned framework data builds the snapshot read model
    When the snapshot is built from the pinned framework data
    Then it produces a title index, an item index, and a slice for every job function
    And the manifest records the pinned commit and a content hash

  @usecase:integrity-dangling @category:error @quality:functional @severity:critical
  Scenario: A dangling framework link fails the build
    Given framework data with a link to a record that does not exist
    When the snapshot build runs on that data
    Then the build fails with an integrity violation

  @usecase:integrity-disagree @category:error @quality:functional @severity:critical
  Scenario: A function and duty that disagree fail the build
    Given framework data where a function and its duty disagree on their link
    When the snapshot build runs on that data
    Then the build fails with an integrity violation

  @usecase:content-hash-stable @category:boundary @quality:reliability @severity:medium
  Scenario: The content hash does not depend on record order
    When the content hash is computed over the same data in two different orders
    Then the two hashes are equal

  @usecase:framework-rls @category:permission @quality:security @severity:critical
  Scenario: The framework tables are closed to the browser
    When the data tier migration is read
    Then row-level security is on for every framework table
    And no policy grants the anon or authenticated role access
