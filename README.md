# Azure Spring Apps for Visual Studio Code (Preview)

<!-- region exclude-from-marketplace -->

[![Version](https://img.shields.io/visual-studio-marketplace/v/vscjava.vscode-azurespringcloud.png)](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-azurespringcloud)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/vscjava.vscode-azurespringcloud.png)](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-azurespringcloud)
[![Build Status](https://dev.azure.com/mseng/VSJava/_apis/build/status/microsoft.vscode-azurespringcloud?branchName=main)](https://dev.azure.com/mseng/VSJava/_build/latest?definitionId=10839&branchName=main)

<!-- endregion exclude-from-marketplace -->

[Azure Spring Apps](https://azure.microsoft.com/services/spring-cloud/) provides a managed service that lets you run microservices on Azure using Spring Boot with no code changes. Use the Azure Spring Apps extension for VS Code to quickly create, manage and deploy apps to an Azure Spring Apps instance.

> Sign up today for your free Azure account and receive 12 months of free popular services, $200 free credit and 25+ always free services 👉 [Start Free](https://azure.microsoft.com/free/open-source).

## Installation

1. Download and install the [Azure Spring Apps extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-azurespringcloud) for Visual Studio Code
2. Wait for the extension to finish installing then reload Visual Studio Code when prompted
3. Once complete, you'll see an Azure icon in the Activity Bar
   > If your activity bar is hidden, you won't be able to access the extension. Show the Activity Bar by clicking View > Appearance > Show Activity Bar
4. Sign in to your Azure Account by clicking Sign in to Azure…
   > If you don't already have an Azure Account, click "Create a Free Azure Account" or you can [try Azure for free](https://code.visualstudio.com/tryappservice/?utm_source=appservice-extension)

## Deploy your first Spring Boot app to Azure Spring Apps

Once you are signed in to your Azure account and you have your app open in Visual
Studio Code, click the Azure icon in the Activity Bar to open the Azure Explorer and you will see the Azure Spring Apps panel.

1.  Right-click on your subscription and click **Create Azure Spring Apps in Portal**. Finish the following steps on Azure Portal to create an Azure Spring Apps instance.

    ![Create Azure Spring Apps instance](https://raw.githubusercontent.com/microsoft/azure-maven-plugins/vscode/azure-springcloud/temp/create-service.png)

1.  After the Azure Spring Apps instance is created, refresh the Azure Explorer and it will show up. Right-click on the Azure Spring Apps instance and click **Create App**. Type app name, select
    Java version and then press **Enter** to start creating.

        ![Create App](https://raw.githubusercontent.com/microsoft/azure-maven-plugins/vscode/azure-springcloud/temp/create-app.png)

1.  The app will be ready in a few minutes, right click on the App and click **Deploy**, select your built Jar file when prompted.

    ![Deploy App](https://raw.githubusercontent.com/microsoft/azure-maven-plugins/vscode/azure-springcloud/temp/deploy-app.png)

1.  You can see the deployment status on the bottom right. Once done, click **Access Public Endpoint** to test the app running on Azure, click **Yes** when prompted to assign public endpoint. Be aware that only Spring Boot fat Jar is supported, [learn more about apps on Azure Spring Apps](https://docs.microsoft.com/azure/spring-cloud/spring-cloud-tutorial-prepare-app-deployment?pivots=programming-language-java).

    ![Access public endpoint](https://raw.githubusercontent.com/microsoft/azure-maven-plugins/vscode/azure-springcloud/temp/access-public-endpoint.png)

## Scale the App

1. You can easily scale the app by right click on the **Instance count** under Scale Settings and click **Edit**. Type **2** and press **Enter** to scale the app.

   ![Scale app](https://raw.githubusercontent.com/microsoft/azure-maven-plugins/vscode/azure-springcloud/temp/scale.png)

## Stream Your Application Logs

1. Expand the App Instances node, right click the instance you want to see logs and click **Start Streaming Logs**.

   ![Start log streaming](https://raw.githubusercontent.com/microsoft/azure-maven-plugins/vscode/azure-springcloud/temp/start-log-streaming.png)

1. The Visual Studio Code output window opens with a connection to the log stream

   ![Log output](https://raw.githubusercontent.com/microsoft/azure-maven-plugins/vscode/azure-springcloud/temp/log-output.png)

## Contributing

There are a couple of ways you can contribute to this repo:

- **Ideas, feature requests and bugs**: We are open to all ideas and we want to get rid of bugs! Use the Issues section to either report a new issue, provide your ideas or contribute to existing threads.
- **Documentation**: Found a typo or strangely worded sentences? Submit a PR!
- **Code**: Contribute bug fixes, features or design changes:
  - Clone the repository locally and open in VS Code.
  - Install [TSLint for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin).
  - Open the terminal (press `CTRL+`\`) and run `npm install`.
  - To build, press `F1` and type in `Tasks: Run Build Task`.
  - Debug: press `F5` to start debugging the extension.

### Legal

You will need to sign a **Contribution License Agreement** before we can accept your pull request.
All you need to do is to submit a pull request, then the PR will get appropriately labelled (e.g. `cla-required`, `cla-norequired`, `cla-signed`, `cla-already-signed`). If you already signed the agreement we will continue with reviewing the PR, otherwise system will tell you how you can sign the CLA. Once you sign the CLA all future PR's will be labeled as `cla-signed`.

### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

### Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow Microsoft’s Trademark & Brand Guidelines. Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party’s policies.

## Security

Microsoft takes the security of our software products and services seriously, which includes all source code repositories managed through our GitHub organizations, which include [Microsoft](https://github.com/Microsoft), [Azure](https://github.com/Azure), [DotNet](https://github.com/dotnet), [AspNet](https://github.com/aspnet), [Xamarin](https://github.com/xamarin), and [our GitHub organizations](https://opensource.microsoft.com/).

If you believe you have found a security vulnerability in any Microsoft-owned repository that meets [Microsoft's definition of a security vulnerability](<https://docs.microsoft.com/en-us/previous-versions/tn-archive/cc751383(v=technet.10)>), please report it to us as described below.

### Reporting Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them to the Microsoft Security Response Center (MSRC) at [https://msrc.microsoft.com/create-report](https://msrc.microsoft.com/create-report).

If you prefer to submit without logging in, send email to [secure@microsoft.com](mailto:secure@microsoft.com). If possible, encrypt your message with our PGP key; please download it from the [Microsoft Security Response Center PGP Key page](https://www.microsoft.com/en-us/msrc/pgp-key-msrc).

You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Additional information can be found at [microsoft.com/msrc](https://www.microsoft.com/msrc).

Please include the requested information listed below (as much as you can provide) to help us better understand the nature and scope of the possible issue:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

If you are reporting for a bug bounty, more complete reports can contribute to a higher bounty award. Please visit our [Microsoft Bug Bounty Program](https://microsoft.com/msrc/bounty) page for more details about our active programs.

### Preferred Languages

We prefer all communications to be in English.

### Policy

Microsoft follows the principle of [Coordinated Vulnerability Disclosure](https://www.microsoft.com/en-us/msrc/cvd).

<!-- endregion exclude-from-marketplace -->

## Telemetry

VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkID=528096&clcid=0x409) to learn more. If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## License

[MIT](LICENSE.md)
