import ast
import os
import json
import argparse

class FunctionCallVisitor(ast.NodeVisitor):
    def __init__(self):
        self.calls = {}
        self.current_function_name = None
        self.main_function_name = None
        self.call_order = []  # 用于记录函数调用的顺序
        self.file_of_function = {}  # 记录每个函数所在的文件
        self.main_file = None  # 记录主函数所在的文件
        self.main_functions = set()  # 记录所有的主函数
        self.main_files = []  # 记录每个主函数所在的文件
        self.class_definitions = {}  # 记录对象名到类名的映射
        self.current_class_name = None  # 记录当前访问的类名

        self.filter = {
        # Python 内置函数
        'abs', 'dict', 'help', 'min', 'setattr', 'all', 'dir', 'hex', 'next', 'slice', 'any',
        'divmod', 'id', 'object', 'sorted', 'ascii', 'enumerate', 'input', 'oct', 'staticmethod',
        'bin', 'eval', 'int', 'open', 'str', 'bool', 'exec', 'isinstance', 'ord', 'sum', 'bytearray',
        'filter', 'issubclass', 'pow', 'super', 'bytes', 'float', 'iter', 'print', 'tuple',
        'callable', 'format', 'len', 'property', 'type', 'chr', 'frozenset', 'list', 'range',
        'vars', 'classmethod', 'getattr', 'locals', 'repr', 'zip', 'compile', 'globals', 'map',
        'reversed', 'import', 'complex', 'hasattr', 'max', 'round', '__import__', 'delattr', 'hash','listdir'
        'memoryview', 'set','list','range','abs','append','getcwd',
        # 常用标准库函数
        'sys.exit','sum','max','min','sample','copy','len','range','le',
        # 其他常用库函数
        'array', 'zeros', 'ones', 'empty', 'tqdm.tqdm', 'cv2.imread', 'cv2.imshow',
        'tqdm','random','zeros','copy','read','join','split','strip'
        }
        self.common_libraries = {"math", "numpy","np", "os", "matplotlib","pandas","tqdm","file","json"}  # 忽略的常见库类名

    def visit_ClassDef(self, node):
        """
        访问类定义，记录当前的类名。
        """
        self.current_class_name = node.name
        self.generic_visit(node)
        self.current_class_name = None  # 退出类定义时重置

    def visit_FunctionDef(self, node):
        if self.current_class_name!=None:
            self.current_function_name = f"{self.current_class_name}.{node.name}" 
        else:
            self.current_function_name = node.name    
        self.file_of_function[node.name] = self.current_file  # 记录函数所在的文件
        self.generic_visit(node)
        if self.current_function_name == self.main_function_name:
            self.main_file = self.current_file  # 记录主函数所在的文件

    def visit_Assign(self, node):
        """
        访问变量赋值，记录对象的类名。
        """
        if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name):
            class_name = node.value.func.id  # 获取类名
            for target in node.targets:
                if isinstance(target, ast.Name):
                    self.class_definitions[target.id] = class_name  # 记录对象名到类名的映射
        self.generic_visit(node)

    def visit_Call(self, node):
        called_function_name = None
        if isinstance(node.func, ast.Name):
            called_function_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name):
                obj_name = node.func.value.id
                if self.get_class_name(obj_name) in self.common_libraries:
                    return
                called_function_name = f"{self.get_class_name(obj_name)}.{node.func.attr}"
            else:
                if self.current_class_name!=None:
                    called_function_name = f"{self.current_class_name}.{node.func.attr}"    
                called_function_name = node.func.attr
        
        if called_function_name and called_function_name not in self.filter and self.current_function_name not in self.filter:  # 检查被调用的函数名是否在过滤器中
            if self.current_function_name in self.calls:
                self.calls[self.current_function_name].add(called_function_name)
            else:
                self.calls[self.current_function_name] = {called_function_name}
            self.call_order.append((self.current_function_name, called_function_name))  # 记录函数调用的顺序
        self.generic_visit(node)
    
    def visit_If(self, node):
        if isinstance(node.test, ast.Compare):
            if isinstance(node.test.left, ast.Name) and node.test.left.id == '__name__':
                if len(node.test.ops) == 1 and isinstance(node.test.ops[0], ast.Eq):
                    if len(node.test.comparators) == 1 and isinstance(node.test.comparators[0], ast.Str) and node.test.comparators[0].s == '__main__':
                        self.current_function_name = node.test.comparators[0].s
                        self.main_files.append(self.current_file)  # 记录主函数所在的文件
        self.generic_visit(node)
        if self.current_function_name == '__main__':
            for item in self.calls[self.current_function_name]:
                if item not in self.filter:
                    self.main_functions.add(item)  # 记录主函数
    
    def get_class_name(self, obj_name):
        """
        获取对象所属的类名，如果没有找到，返回对象名本身。
        """
        return self.class_definitions.get(obj_name, obj_name)

def build_call_graph(directory):
    visitor = FunctionCallVisitor()
    for subdir, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(subdir, file)
                visitor.current_file = os.path.relpath(file_path, directory)  # 设置当前文件
                with open(file_path, "r",errors='ignore') as source:
                    tree = ast.parse(source.read())
                    visitor.visit(tree)
    for item in visitor.calls:
        print(item)
    return visitor.calls, visitor.main_functions, visitor.main_files, visitor.call_order, visitor.file_of_function  # 返回所有的主函数和他们所在的文件

def draw_graph(calls, main_function_name, call_order, file_of_function, output_file):
    node_calls = {}
    
    def traverse(function_name):
        if function_name in node_calls:
            return node_calls[function_name]

        node_calls[function_name] = []
        if function_name in calls:
            for callee in calls[function_name]:
                node_calls[function_name].append(callee)
                traverse(callee)
    
    traverse(main_function_name)
    
    with open(output_file, 'w') as f:
        json.dump(node_calls, f, indent=4)

def main():
    parser = argparse.ArgumentParser(description="Generate a function call graph.")
    # 获取脚本文件的路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # 获取脚本上级目录的路径
    parent_dir = os.path.dirname(script_dir)
    # 构建默认目标路径
    default_path = os.path.join(parent_dir, "test", "EC_LargeGroupDecision_Code")
    parser.add_argument('--directory', '-d', type=str, default=default_path, help='The directory to analyze, defaults to the current working directory.')
    args = parser.parse_args()
    directory = args.directory
    print("directory: ",directory)

    calls, main_functions, main_files, call_order, file_of_function = build_call_graph(directory)  # 获取所有的主函数和他们所在的文件
    # 获取目标项目上级目录的路径;以便存放生成的json文件
    target_parent_dir = os.path.dirname(directory)
    # 构建目标路径
    output_directory = os.path.join(target_parent_dir, 'JsonRes')
    print("output_directory: ", output_directory)
    os.makedirs(output_directory, exist_ok=True)
    
    overall_call_graph = {}
    for main_function_name in main_functions:
        output_file = os.path.join(output_directory, f'call_graph_{main_function_name}.json')
        draw_graph(calls, main_function_name, call_order, file_of_function, output_file)
        # print("---------",main_function_name)
        with open(output_file, 'r') as f:
            function_call_data = json.load(f)
            overall_call_graph[main_function_name] = function_call_data
    
    with open(os.path.join(output_directory, 'overall_call_graph.json'), 'w') as f:
        json.dump(overall_call_graph, f, indent=4)

if __name__ == "__main__":
    main()
