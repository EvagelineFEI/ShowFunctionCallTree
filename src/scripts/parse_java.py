import os
import json
import javalang

def get_java_files(directory):
    java_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".java"):
                java_files.append(os.path.join(root, file))
    return java_files

def parse_java_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        try:
            return javalang.parse.parse(file.read())
        except javalang.parser.JavaSyntaxError as e:
            print(f"Syntax error in {file_path}: {e}")
            return None

COMMON_LIBRARIES = {
    'System.out.println', 'Math', 'String', 'Object', 'Integer', 'Double', 'Float', 'Boolean',
    'Arrays', 'Collections', 'List', 'Map', 'Set', 'File', 'InputStream', 'OutputStream', 'Reader', 'Writer'
}

def is_common_library_call(called_method):
    for common_lib in COMMON_LIBRARIES:
        if called_method.startswith(common_lib):
            return True
    return False

def extract_method_calls(tree):
    method_calls = {}
    class_calls = {}
    class_stack = []
    method_stack = []

    for path, node in tree:
        if isinstance(node, javalang.tree.ClassDeclaration):
            class_stack.append(node.name)
            current_class = '.'.join(class_stack)
            if current_class not in class_calls:
                class_calls[current_class] = set()

        if isinstance(node, javalang.tree.MethodDeclaration):
            method_stack.append(node.name)

        if isinstance(node, javalang.tree.MethodInvocation):
            if class_stack and method_stack:
                current_class = '.'.join(class_stack)
                current_method = '.'.join(method_stack)
                full_method_name = f"{current_class}.{current_method}"

                if full_method_name not in method_calls:
                    method_calls[full_method_name] = set()

                if node.qualifier:
                    called_method = f"{node.qualifier}.{node.member}"
                else:
                    called_method = node.member

                if not is_common_library_call(called_method):
                    method_calls[full_method_name].add(called_method)

        if isinstance(node, javalang.tree.ClassCreator):
            if class_stack:
                current_class = '.'.join(class_stack)
                class_calls[current_class].add(node.type.name)

        # 清理栈
        if path and isinstance(path[-1], javalang.tree.MethodDeclaration) and not isinstance(node, javalang.tree.MethodDeclaration):
            if method_stack:
                method_stack.pop()

        if path and isinstance(path[-1], javalang.tree.ClassDeclaration) and not isinstance(node, javalang.tree.ClassDeclaration):
            if class_stack:
                class_stack.pop()

    return method_calls, class_calls



def extract_methods_and_classes_from_file(file_path):
    tree = parse_java_file(file_path)
    if tree:
        return extract_method_calls(tree)
    return {}, {}

def main(project_directory, output_file):
    java_files = get_java_files(project_directory)
    all_method_calls = {}
    all_class_calls = {}
    
    for java_file in java_files:
        method_calls, class_calls = extract_methods_and_classes_from_file(java_file)
        for method, calls in method_calls.items():
            if method not in all_method_calls:
                all_method_calls[method] = set()
            all_method_calls[method].update(calls)
        
        for cls, calls in class_calls.items():
            if cls not in all_class_calls:
                all_class_calls[cls] = set()
            all_class_calls[cls].update(calls)
    
    # Convert sets to lists for JSON serialization
    all_method_calls = {k: list(v) for k, v in all_method_calls.items()}
    all_class_calls = {k: list(v) for k, v in all_class_calls.items()}
    
    result = {
        "method_calls": all_method_calls,
        "class_calls": all_class_calls
    }

    with open(output_file, 'w', encoding='utf-8') as json_file:
        json.dump(result, json_file, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    project_directory = "D:\\ILOVE_CODING\\Java\\netty-socketio"  # 替换为你的项目路径
    output_file = "method_and_class_calls.json"  # 替换为你希望输出的JSON文件路径
    main(project_directory, output_file)
