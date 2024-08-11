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
		
		let command = '';
		let jsonPath = '';
        process.env.PYTHON_PATH = 'D:\\Download\\anaconda\\envs\\GPTuner_demo\\python.exe';
        const pythonInterpreter = process.env.PYTHON_PATH || 'python';
		if (fileType === 'Python Project') {
			command = `${pythonInterpreter} ${context.extensionPath}\\src\\scripts\\parse_python_old.py --directory ${filePath}`;
			// 在同级目录下创建 jsonPath
			jsonPath = path.join(directoryPath, 'JsonRes','overall_call_graph.json');
			// const jsonPath = path.join(context.extensionPath, 'src', 'python_json', 'overrall_call_grah.json');
	    } 
		else if (fileType === 'Java Project') {
			command = `${pythonInterpreter} ${context.extensionPath}\\src\\scripts\\parse_java.py --directory ${filePath}`;
			jsonPath = path.join(directoryPath, 'JavaParseRes');
			// const jsonPath = path.join(context.extensionPath, 'src', 'java_json', 'overrall_call_grah.json');
		} 
		else {
			vscode.window.showErrorMessage('Unsupported file type');
			return;
		}
        const outputChannel = vscode.window.createOutputChannel('Analysis Output');
		exec(command, (error, stdout, stderr) => {
			if (error) {
                outputChannel.appendLine(`Error: ${error.message}`);
                outputChannel.appendLine(`stderr: ${stderr}`);
                outputChannel.show();
                // 显示错误信息提示框
                vscode.window.showErrorMessage(`Error: ${error.message}. Check 'Analysis Output' for details.`);
                // return;
			}
			if (stderr) {
				console.error(`stderr: ${stderr}`);
				// return;
			}
			console.log(`stdout: ${stdout}`);
            outputChannel.appendLine(`stdout: ${stdout}`);
            outputChannel.show();
            console.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
            // 显示执行结果提示框
            vscode.window.showInformationMessage(`Result: ${stdout}`);
		});

		
		try {
            if (fileType === 'Python Project')
            {
                let jsonObject0 = {};
                if (fs.existsSync(jsonPath)) {
                    const jsonData = fs.readFileSync(jsonPath, 'utf8');
                    jsonObject0 = JSON.parse(jsonData);
                }
                // 创建一个 Webview 面板
                const panel = vscode.window.createWebviewPanel(
                    'functionCallVisualizerPython', 
                    'Function Call Visualizer', 
                    vscode.ViewColumn.One, 
                    {
                        enableScripts: true
                    }
                );
                // const result = child_process.execSync(command).toString();
                panel.webview.html = getWebviewContent(jsonObject0);
                    panel.webview.onDidReceiveMessage(message => {
                        switch (message.command) {
                            case 'alert':
                                vscode.window.showErrorMessage(message.text);
                                return;
                        }
                    });
            }
            if(fileType === 'Java Project')
            {
                let jsonObject1 = {};
                let jsonObject2 = {};
                if (fs.existsSync(jsonPath)) {
                    const path1 = path.join(jsonPath, 'method_graph.json');
                    const jsonData1 = fs.readFileSync(path1, 'utf8');
                    if(fs.existsSync(path1))jsonObject1 = JSON.parse(jsonData1);
                    const path2 = path.join(jsonPath, 'class_graph.json');
                    const jsonData2 = fs.readFileSync(path2, 'utf8');
                    if(fs.existsSync(path2))jsonObject2 = JSON.parse(jsonData2);
                }
                    
                
                // 创建两个 Webview 面板
                const panel1 = vscode.window.createWebviewPanel(
                    'functionCallVisualizerJava1', 
                    'Method Call Visualizer', 
                    vscode.ViewColumn.One, 
                    {
                        enableScripts: true
                    }
                );
                // const result = child_process.execSync(command).toString();
                
                panel1.webview.html = getWebviewContent2(jsonObject1);
                    panel1.webview.onDidReceiveMessage(message => {
                        switch (message.command) {
                            case 'alert':
                                vscode.window.showErrorMessage(message.text);
                                return;
                        }
                    });
                const panel2 = vscode.window.createWebviewPanel(
                    'functionCallVisualizerJava2', 
                    'Class Call Visualizer', 
                    vscode.ViewColumn.One, 
                    {
                        enableScripts: true
                    }
                );
                // const result = child_process.execSync(command).toString();
                
                panel2.webview.html = getWebviewContent2(jsonObject2);
                    panel2.webview.onDidReceiveMessage(message => {
                        switch (message.command) {
                            case 'alert':
                                vscode.window.showErrorMessage(message.text);
                                return;
                        }
                    });
            }
            
			
		} catch (error) {
			vscode.window.showErrorMessage('Error generating function call graph');
			console.error(error);
		}
	});
	context.subscriptions.push(callGraphDisposable);
}

function getWebviewContent(data: any) {
    const jsonData = JSON.stringify(data);
//     return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Function Call Hierarchy</title>
//     <style>
//         #cy {
//             width: 100%;
//             height: 600px;
//             display: block;
//             background-color: #ffffff; /* 设置背景为白色 */
//         }
//     </style>
//     <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.21.1/cytoscape.min.js"></script>
//     <script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js"></script>
//     <script src="https://unpkg.com/cytoscape-dagre/cytoscape-dagre.js"></script>
// </head>
// <body>
//     <div id="cy"></div>
//     <script>
//         const jsonData = ${jsonData};

//         function parseJsonToElements(json, parentId = null) {
//             let elements = [];
//             for (const key in json) {
//                 const id = key;
//                 elements.push({
//                     data: { id: id, label: key }
//                 });
//                 if (parentId) {
//                     elements.push({
//                         data: { source: parentId, target: id }
//                     });
//                 }
//                 elements = elements.concat(parseJsonToElements(json[key], id));
//             }
//             return elements;
//         }

//         const elements = parseJsonToElements(jsonData);

//         const cy = cytoscape({
//             container: document.getElementById('cy'),
//             elements: elements,
//             style: [
//                 {
//                     selector: 'node',
//                     style: {
//                         'label': 'data(label)',
//                         'text-valign': 'center',
//                         'text-halign': 'center',
//                         'background-color': '#999',
//                         'color': '#333',
//                         'font-size': '12px'
//                     }
//                 },
//                 {
//                     selector: 'edge',
//                     style: {
//                         'width': 2,
//                         'line-color': '#ccc',
//                         'target-arrow-color': '#ccc',
//                         'target-arrow-shape': 'triangle'
//                     }
//                 }
//             ],
//             layout: {
//                 name: 'dagre', // 使用Dagre布局实现层次分明的效果
//                 rankDir: 'TB', // 从上到下的布局方式 (也可以选择 'LR' 从左到右)
//                 nodeSep: 50, // 节点之间的垂直间距
//                 edgeSep: 10, // 边之间的垂直间距
//                 rankSep: 100, // 每一层之间的间距
//                 align: 'DR', // 对齐方式 (选项 'UL', 'UR', 'DL', 'DR')
//                 ranker: 'network-simplex', // 层级分配算法，可以选 'longest-path' 或 'tight-tree'
//                 minLen: function(edge) { return 2; }, // 最小边长
//                 padding: 10, // 布局的内边距
//                 spacingFactor: 1.5, // 控制整体布局的扩展度
//             }
//         });
//     </script>
// </body>
// </html>

// `;
//     return `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>JSON Viewer</title>
//     <style>
//         .node {
//             margin-left: 20px;
//             cursor: pointer;
//             color: blue;
//         }
//         .node.collapsed > .children {
//             display: none;
//         }
//     </style>
// </head>
// <body>

// <div id="jsonViewer"></div>

// <script>
//     const data = ${jsonData};

//     function createNode(key, value) {
//         const nodeElement = document.createElement('div');
//         nodeElement.className = 'node';
//         nodeElement.textContent = key;

//         if (typeof value === 'object' && value !== null) {
//             const childrenContainer = document.createElement('div');
//             childrenContainer.className = 'children';

//             for (const childKey in value) {
//                 childrenContainer.appendChild(createNode(childKey, value[childKey]));
//             }

//             nodeElement.appendChild(childrenContainer);

//             nodeElement.addEventListener('click', () => {
//                 nodeElement.classList.toggle('collapsed');
//             });
//         }

//         return nodeElement;
//     }

//     const viewer = document.getElementById('jsonViewer');
//     for (const key in data) {
//         viewer.appendChild(createNode(key, data[key]));
//     }
// </script>

// </body>
// </html>
// `;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON Viewer</title>
    <style>
        body {
            background-color: white;
            font-family: Arial, sans-serif;
            font-size: 16px;
            color: gray;
        }
        .node {
            margin-left: 20px;
            cursor: pointer;
        }
        .node.collapsed > .children {
            display: none;
        }
    </style>
</head>
<body>

<div id="jsonViewer"></div>

<script>
    const data = ${jsonData};

    function createNode(key, value) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'node';
        nodeElement.textContent = key;

        if (typeof value === 'object' && value !== null) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            childrenContainer.style.marginLeft = '20px';

            for (const childKey in value) {
                childrenContainer.appendChild(createNode(childKey, value[childKey]));
            }

            nodeElement.appendChild(childrenContainer);
            nodeElement.classList.add('collapsed');

            nodeElement.addEventListener('click', (e) => {
                e.stopPropagation();
                nodeElement.classList.toggle('collapsed');
            });
        }

        return nodeElement;
    }

    const viewer = document.getElementById('jsonViewer');
    for (const key in data) {
        viewer.appendChild(createNode(key, data[key]));
    }
</script>

</body>
</html>
`;
}
function getWebviewContent2(data: any){
    const jsonData = JSON.stringify(data);
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Simple JSON Hierarchy Visualization</title>
    <style>
        .nested {
            margin-left: 20px;
            cursor: pointer;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div id="container"></div>
    
    <script>
        const data = ${jsonData};

        function renderJSON(data, container) {
            Object.keys(data).forEach(key => {
                const element = document.createElement('div');
                element.className = 'nested';
                element.textContent = key;
                
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'hidden';
                
                element.addEventListener('click', () => {
                    childrenContainer.classList.toggle('hidden');
                });
                
                container.appendChild(element);
                container.appendChild(childrenContainer);
                
                if (Array.isArray(data[key])) {
                    data[key].forEach(item => {
                        const childElement = document.createElement('div');
                        childElement.className = 'nested';
                        childElement.textContent = item;
                        childrenContainer.appendChild(childElement);
                    });
                } else {
                    renderJSON(data[key], childrenContainer);
                }
            });
        }

        renderJSON(data.method_calls, document.getElementById('container'));
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
function translate($: any, arg1: { d: any; "": any; }, $1: any, arg3: { d: any; "": any; }) {
    throw new Error('Function not implemented.');
}

