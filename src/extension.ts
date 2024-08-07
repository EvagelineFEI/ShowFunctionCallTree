// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { exec } from 'child_process';
// import dotenv from 'dotenv';
// dotenv.config();
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "helloworld" is now active!');
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const hello_disposable = vscode.commands.registerCommand('helloworld.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from HelloWorld!');
	});
	context.subscriptions.push(hello_disposable);

	// Register the function call graph command
	const callGraphDisposable = vscode.commands.registerCommand('functionCallGraph.showGraph', async () => {
		vscode.window.showInformationMessage('Generating function call graph...');
		// const editor = vscode.window.activeTextEditor;
		// if (!editor) {
		// 	vscode.window.showErrorMessage('No active editor found');
		// 	return;
		// }
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No folder or workspace opened');
			return;
		}
		// 这里我们假设只打开了一个文件夹。如果打开了多个文件夹，可以根据需要调整逻辑
		const workspaceFolder = workspaceFolders[0];
		const filePath = workspaceFolder.uri.fsPath;
		vscode.window.showInformationMessage(`Workspace folder path: ${filePath}`);
		// const document = editor.document;
		// const filePath = document.uri.fsPath;
		const directoryPath = path.dirname(filePath);
		const fileType = determineProjectType(filePath);
		vscode.window.showInformationMessage(`Project type: ${fileType}`);
		// 创建一个 Webview 面板
		const panel = vscode.window.createWebviewPanel(
            'functionCallVisualizer', 
            'Function Call Visualizer', 
            vscode.ViewColumn.One, 
            {
                enableScripts: true
            }
        );
		let command = '';
		let jsonObject = {};
		let jsonPath = '';
        process.env.PYTHON_PATH = 'D:\\Download\\anaconda\\envs\\GPTuner_demo\\python.exe';
        const pythonInterpreter = process.env.PYTHON_PATH || 'python';
		if (fileType === 'Python Project') {
			command = `${pythonInterpreter} ${context.extensionPath}\\src\\scripts\\parse_python.py --directory ${filePath}`;
			// 在同级目录下创建 jsonPath
			jsonPath = path.join(directoryPath, 'JsonRes','overall_call_graph.json');
			// const jsonPath = path.join(context.extensionPath, 'src', 'python_json', 'overrall_call_grah.json');
	    } 
		else if (fileType === 'Java Project') {
			command = `java -cp ${context.extensionPath}/src/scripts ParseJava ${filePath}`;
			jsonPath = path.join(directoryPath, 'JsonRes','overrall_call_grah.json');
			// const jsonPath = path.join(context.extensionPath, 'src', 'java_json', 'overrall_call_grah.json');
		} 
		else {
			vscode.window.showErrorMessage('Unsupported file type');
			return;
		}
        // const outputChannel = vscode.window.createOutputChannel('Analysis Output');
		// exec(command, (error, stdout, stderr) => {
		// 	if (error) {
        //         outputChannel.appendLine(`Error: ${error.message}`);
        //         outputChannel.appendLine(`stderr: ${stderr}`);
        //         outputChannel.show();
        //         // 显示错误信息提示框
        //         vscode.window.showErrorMessage(`Error: ${error.message}. Check 'Analysis Output' for details.`);
        //         // return;
		// 	}
		// 	if (stderr) {
		// 		console.error(`stderr: ${stderr}`);
		// 		// return;
		// 	}
		// 	console.log(`stdout: ${stdout}`);
        //     outputChannel.appendLine(`stdout: ${stdout}`);
        //     outputChannel.show();
        //     console.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
        //     // 显示执行结果提示框
        //     vscode.window.showInformationMessage(`Result: ${stdout}`);
		// });

		if (fs.existsSync(jsonPath)) {
			const jsonData = fs.readFileSync(jsonPath, 'utf8');
			jsonObject = JSON.parse(jsonData);
		}
		
		try {
			// const result = child_process.execSync(command).toString();
			panel.webview.html = getWebviewContent(jsonObject);
				panel.webview.onDidReceiveMessage(message => {
					switch (message.command) {
						case 'alert':
							vscode.window.showErrorMessage(message.text);
							return;
					}
        		});
			// panel.webview.html = getWebviewContent(result);
		} catch (error) {
			vscode.window.showErrorMessage('Error generating function call graph');
			console.error(error);
		}
	});
	context.subscriptions.push(callGraphDisposable);
}

function getWebviewContent(data: any) {
    const jsonData = JSON.stringify(data);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Function Call Tree</title>
    <script src="https://d3js.org/d3.v6.min.js"></script>
    <style>
        body {
            background-color: white;
            overflow: hidden;
        }
        .node circle {
            fill: #999;
            stroke: steelblue;
            stroke-width: 3px;
        }
        .node text {
            font: 14px sans-serif;
        }
        .link {
            fill: none;
            stroke: #555;
            stroke-opacity: 0.4;
            stroke-width: 1.5px;
        }
    </style>
</head>
<body>
    <div id="tree-container" style="width: 100%; height: 100vh;"></div>
    <script>
        const data = ${jsonData};

        function transformData(data) {
            const transformed = { name: "root", children: [] };
            for (const [key, value] of Object.entries(data)) {
                const node = { name: key, children: [] };
                for (const [func, calls] of Object.entries(value)) {
                    const funcNode = { name: func, children: calls.map(call => ({ name: call, children: [] })) };
                    node.children.push(funcNode);
                }
                transformed.children.push(node);
            }
            return transformed;
        }

        const transformedData = transformData(data);

        const margin = { top: 20, right: 90, bottom: 30, left: 90 },
            width = 960 - margin.left - margin.right,
            height = 800 - margin.top - margin.bottom;

        const svg = d3.select("#tree-container").append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(d3.zoom().on("zoom", function (event) {
                svg.attr("transform", event.transform);
            }))
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const root = d3.hierarchy(transformedData);

        const treeLayout = d3.tree().nodeSize([20, 300]);
        treeLayout(root);

        const link = svg.selectAll(".link")
            .data(root.links())
            .enter().append("path")
            .attr("class", "link")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        const node = svg.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

        node.append("circle")
            .attr("r", 5);

        node.append("text")
            .attr("dy", ".35em")
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.data.name);
    </script>
</body>
</html>

`;
}

// Function to recursively search for specific file types in a directory
function searchForFiles(directory: string, extensions: string | string[]) {
    const files = fs.readdirSync(directory);
    for (let file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (searchForFiles(fullPath, extensions)) {
                return true;
            }
        } else if (extensions.includes(path.extname(fullPath))) {
            return true;
        }
    }
    return false;
}

// Function to determine project type
function determineProjectType(projectPath: string) {
    if (searchForFiles(projectPath, ['.py'])) {
        return 'Python Project';
    } else if (searchForFiles(projectPath, ['.java']) || fs.existsSync(path.join(projectPath, 'src'))) {
        return 'Java Project';
    } else {
        return 'Unknown Project Type';
    }
}


// This method is called when your extension is deactivated
export function deactivate() {}
