# Change Log

## 0.9.0 - 2023-11-01
- Add `Open Application Accelerator`(integrate with `Tanzu App Accelerator` extension) action on enterprise tier spring apps.

## 0.8.1 - 2023-05-11
- Fix duplicate message about assigning public endpoint.
- Fix scaling issues about apps of standard consumption plan.

## 0.8.0 - 2023-05-10
- Validate artifact's java bytecode version to runtime version of target app when deploying artifact to Azure.
- Open application log stream after deploying artifact to target app.
- Add support for Azure Spring Apps consumption plan.
- Add `Open Application Live View` action on enterprise tier spring apps.
- Improve performance of creating apps.
- Refactor code structure and upgrade dependencies.
- Fix: spring apps doesn't load sub apps proactively sometimes.

## 0.7.1 - 2023-04-05
- Fix: [#54](https://github.com/microsoft/vscode-azurespringcloud/issues/54) Entry "view live information" is missing from context menu of app node
- Fix: user have to select instance starting from Spring Apps but not current selected Spring App when `Attach Debugger`.

## 0.7.0 - 2023-03-24
- Integrate with `Azure Resources` extension.

## 0.6.1 - 2023-03-14

### Updated
- Upgrade dependency `@azure/arm-appplatform` to the latest.

## 0.6.0 - 2023-03-02

### Added
- Add support for viewing live information(beans, mappings, memory graph) from your running application with `Spring Boot Dashboard` extension.

## 0.5.0 - 2022-11-02

### Added
- Add support for remote debugging

## 0.4.0 - 2022-05-23

### Added
- Add support for enterprise tier
- Add support for 0.5Gi memory and 0.5vCUP

### Updated
- improve performance by lazy-loading and cache

## 0.3.0 - 2022-05-09

### Updated
- modify all `Azure Spring Cloud` text to `Azure Spring Apps` since `Azure Spring Cloud` is to be renamed as `Azure Spring Apps`

## 0.2.0 - 2021-06-30

### Updated
- All available commands are now accessible from Command Palette


## 0.1.0 - 2021-01-08

### Added
- Manage Azure Spring Cloud service instance in Azure Explorer
    - Create from portal
    - Delete
- Manage Azure Spring Cloud apps in Azure Explorer
    - Create/Delete/Start/Stop/Restart apps
    - Assign/un-assign public endpoint
    - Access public/test endpoint
    - Scale (vCPU, memory, instance count)
    - Manage environment variables
    - Manage JVM options
- Deploy apps
    - Jar deploy for Java app
- Monitoring and troubleshooting apps
    - App Status (running/updating…)
    - Start/Stop log streaming
