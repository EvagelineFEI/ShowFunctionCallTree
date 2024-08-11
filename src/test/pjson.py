import json

def restructure_json(input_file_path, output_file_path):
    with open(input_file_path, 'r') as file:
        data = json.load(file)

    root_key = next(iter(data))
    roots = data[root_key]
    new_data = {root_key: {}}

    visited = set()

    def handle_node(node, parent_dict, grandparent_name=None):
        if node == grandparent_name:
            renamed_node = f"{node}_SameNameMethodFromOtherClass"
            print(renamed_node)
        else:
            renamed_node = node

        if renamed_node in parent_dict or node in visited:
            renamed_node = f"{node}_SameNameMethodFromOtherClass"
            parent_dict[renamed_node] = {}
            return

        parent_dict[renamed_node] = {}
        visited.add(node)

        if node in data:
            for child in data[node]:
                handle_node(child, parent_dict[renamed_node], node)
        visited.remove(node)

    for root in roots:
        handle_node(root, new_data[root_key])

    with open(output_file_path, 'w') as file:
        json.dump(new_data, file, indent=4)
# 调用函数
if __name__ == "__main__":

    input_file_path = 'D:\ILOVE_CODING\plugin-ts\hello\helloworld\src\\test\JsonRes\call_graph_evolution.json'  # 指定你的输入 JSON 文件路径
    output_file_path = 'output_json_file.json'  # 指定输出 JSON 文件路径
    restructure_json(input_file_path, output_file_path)
