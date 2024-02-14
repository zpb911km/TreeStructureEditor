import unicodedata


center = False
min_width = 5
arrow = '►'


class Node():
    def __init__(self, level: int, content: str) -> None:
        self.level: int = level
        self.content: str = content


def parser_internal2tree(nodes: list[Node]) -> str:
    '''
    Transform the internal data to tree structure data.

    Args:
        nodes (list[Node]): list of tuple(level:int, content:str), also 'the internal data'

    Returns:
        str: specified tree structure str
    '''
    prefix = ['├─', '└─', '│ ', '  ']
    prefix_list = []
    for node in nodes:
        line_prefix = [3] * (node.level - 1)
        prefix_list.append(line_prefix)

    for Anum, Anode in enumerate(nodes):
        if Anode.level == 1:
            continue
        for Bnum, Bnode in enumerate(nodes[Anum + 1:], start=Anum + 1):
            if Anode.level > Bnode.level:
                prefix_list[Anum][Anode.level - 2] = 1
                break
            elif Anode.level == Bnode.level:
                prefix_list[Anum][Anode.level - 2] = 0
                for i in range(Anum + 1, Bnum):
                    prefix_list[i][Anode.level - 2] = 2
                break
        else:
            # If no sibling or child at a lower level is found, use the end line prefix
            prefix_list[Anum][Anode.level - 2] = 1

    out_text = ''
    for num, node in enumerate(nodes):
        for style in prefix_list[num]:
            out_text += prefix[style]
        out_text += arrow + node.content + '\n'

    return out_text[:-1]  # Remove the last newline character


def parser_tree2internal(tree_str: str) -> list[Node]:
    '''
    Transform tree structure str to the internal data.

    Args:
        tree_str (str): specified tree structure str

    Returns:
        list[Node]: list of Node(level:int, content:str), also 'the internal data'
    '''
    lines = tree_str.split('\n')
    nodes = []
    for line in lines:
        if arrow not in line:
            continue
        prefix, content = line.split(arrow, 1)
        level = len(prefix) // 2 + 1
        nodes.append(Node(level, content))
    return nodes


def parser_text2internal(text):
    if len(text.split('\n')) > 1:
        if text[0] in ['>', '\u200b', '▻', '►', '▹', '▸', '']:
            arrow = text[0]
        else:
            arrow = '►'
    else:
        arrow = '►'

    def table_to_list(table_str: str, rows: int, cols: int) -> list[list[str]]:
        try:
            c = ['─', '│', '┌', '┘', '└', '┐', '├', '┤', '┬', '┴', '┼']
            # 分割表格字符串为行
            lines = table_str.split('\n')
            # 移除表格顶部和底部的边框
            lines = lines[1:-1]
            # 移除分隔线
            lines = [line for line in lines if c[6] not in line]
            # 解析单元格内容
            dataMap = []
            for line in lines:
                # 移除左右边框
                line = line[1:-1]
                # 根据垂直分隔符分割单元格
                cells = line.split(c[1])
                # 移除单元格内容周围的空格并添加到dataMap
                dataMap.append([cell.strip() for cell in cells])
        except IndexError:
            new_map = []
            for _ in range(rows):
                new_row = []
                for _ in range(cols):
                    new_row.append(' ')
                new_map.append(new_row)
            return new_map
        if len(dataMap) != rows or len(dataMap[0]) != cols:
            new_map = []
            for _ in range(rows):
                new_row = []
                for _ in range(cols):
                    new_row.append(' ')
                new_map.append(new_row)
            return new_map
        return dataMap

    lines = text.split('\n')
    node_list = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if len(line) == 0:
            level = len(lines[i - 1].split(arrow, 1)[0]) // 2 + 1
            content = ''
        elif arrow not in line:
            level = len(line) // 2 + 1
            content = ''
        else:
            level = len(line.split(arrow, 1)[0]) // 2 + 1
            content = line.split(arrow, 1)[-1]
        if content.startswith('Table('):
            table_rows = int(content.split('(')[1].split(',')[0])
            table_cols = int(content.split(',')[1].split(')')[0])
            table_lines = ''
            try:
                for j in range(i + 1, i + 2 * table_rows + 2):
                    table_lines += lines[j].split(arrow, 1)[-1] + '\n'
                    j += 1
            except IndexError:
                pass
            table_list = table_to_list(table_lines[:-1], table_rows, table_cols)
            table_storage = ''
            for m in table_list:
                for n in m:
                    table_storage += n + '░'
                table_storage += '▓'
            content += f"; {table_storage}"
            i = j - 1  # 循环结束时，i已经指向下一行，这里需要回退一行
        node = Node(level, content)
        # 将节点添加到树中
        node_list.append(node)
        i += 1

    # 检查操作符
    for node in node_list:
        if node.content.startswith('<'):
            node.level -= 1
            node.content = node.content[1:]
        elif node.content.startswith('>'):
            node.level += 1
            node.content = node.content[1:]
        elif node.content.startswith('\\\\'):
            node_list.remove(node)
            node.content = node.content[2:]
    return node_list


def parser_list2table(dataMap: list[list[str]], center: bool = False, min_width: int = 0) -> str:
    # 定义表格边框字符
    c = ['─', '│', '┌', '└', '┘', '┐', '├', '┤', '┬', '┴', '┼', ' ']
    #     0    1    2    3    4    5    6    7    8    9    10   11
    # c = ['-', '╎', '+', '+', '+', '+', '+', '+', '+', '+', '+', ' ']
    #     0    1    2    3    4    5    6    7    8    9    10   11
    # c = ['━', '┃', '┏', '┗', '┛', '┓', '┣', '┫', '┳', '┻', '╋', ' ']
    #     0    1    2    3    4    5    6    7    8    9    10   11

    def get_east_asian_width_count(text):
        """计算字符串的打印宽度，考虑东亚宽度字符。"""
        return sum(2 if unicodedata.east_asian_width(char) in 'FW' else 1 for char in text)

    # 计算每一列的最大宽度
    col_widths = [max(get_east_asian_width_count(cell) for cell in column) for column in zip(*dataMap)]
    col_widths = [max(width, min_width) for width in col_widths]

    # 创建水平边框线
    def create_horizontal_side(left_corner, middle, right_corner):
        line = left_corner
        for width in col_widths:
            line += c[0] * width + middle
        return line[:-1] + right_corner

    top_horizontal_side = create_horizontal_side(c[2], c[8], c[5])
    bottom_horizontal_side = create_horizontal_side(c[3], c[9], c[4])
    middle_horizontal_side = create_horizontal_side(c[6], c[10], c[7])

    # 构建完整的表格
    table_lines = [top_horizontal_side]
    for i, row in enumerate(dataMap):
        line = c[1]
        for j, cell in enumerate(row):
            # 为东亚宽度字符计算填充
            cell_width = get_east_asian_width_count(cell)
            padding = col_widths[j] - cell_width
            left_padding = padding // 2 if center else 0
            right_padding = padding - left_padding if center else padding
            line += c[11] * left_padding + cell + c[11] * right_padding + c[1]
        table_lines.append(line)
        # 在行后添加水平边框或底线
        table_lines.append(middle_horizontal_side if i < len(dataMap) - 1 else bottom_horizontal_side)

    return '\n'.join(table_lines)


def parser_internal2text(node_list: list[Node]) -> str:
    # 先把表格展开成一堆node
    for num, node in enumerate(node_list):
        if '░▓' in node.content:
            new_list = []
            new_list.append(Node(node.level, node.content.split(';')[0]))
            table_map = []
            for i in node.content.split(';')[1].split('░▓'):
                if len(i) == 0:
                    break
                line_map = []
                for j in i.split('░'):
                    line_map.append(j)
                table_map.append(line_map)
            global center, min_width
            table_str = parser_list2table(table_map, center, min_width)
            for i in table_str.split('\n'):
                new_list.append(Node(node.level + 1, i))
            node_list = node_list[:num] + new_list + node_list[num + 1:]
            return parser_internal2text(node_list)
    else:
        return parser_internal2tree(node_list)


if __name__ == '__main__':
    mixed_text = '''>ROOT
├─>Title
│ ├─>Subtitle
│ │ └─>Content
│ │   └─>Comment
│ └─>Table(2,3)666
│   ├─>┌───────────┬────────────────────────────┬─────┐
│   ├─>│ 这是个表格│标题1                       │@    │
│   ├─>├───────────┼────────────────────────────┼─────┤
│   ├─>│甲         │很长很长很长很长很长很长很长│？   │
│   └─>└───────────┴────────────────────────────┴─────┘
└─>Title
  ├─>Subtitle
  │ └─>Content'''

    node_list: list[Node] = [
        Node(1, 'ROOT'),
        Node(2, 'Title'),
        Node(3, 'Subtitle'),
        Node(4, 'Content'),
        Node(5, 'Comment'),
        Node(3, 'Subtitle'),
        Node(2, 'Title'),
        Node(3, 'Subtitle'),
        Node(4, 'Content')
    ]

    tree_str = '>ROOT\n├─>Title\n│ ├─>Subtitle\n│ │ ├─>Content\n│ │ │ └─>Comment\n│ │ └─>?\n│ └─>Subtitle\n└─>Title\n  └─>Subtitle\n    └─>Content'
    table_str = '''┌──────────┬────────────────────────────┬──┐
    │这是个表格│           标题1            │@ │
    ├──────────┼────────────────────────────┼──┤
    │    甲    │很长很长很长很长很长很长很长│？│
    ├──────────┼────────────────────────────┼──┤
    │    乙    │        最小长度为6         │/ │
    └──────────┴────────────────────────────┴──┘'''

    # print('\n'.join('Node('+str(x.level)+', \''+x.content+'\'),' for x in parser_tree2internal(mixed_text)))
    print('\n'.join('Node('+str(x.level)+', \''+x.content+'\'),' for x in parser_text2internal(mixed_text)))

    node_list: list[Node] = [
        Node(1, 'ROOT'),
        Node(2, 'Title'),
        Node(3, 'Subtitle'),
        Node(4, 'Content'),
        Node(5, 'Comment'),
        Node(3, 'Table(2,3)666;这是个表格░标题1░@░▓甲░很长很长很长很长很长很长很长░？░▓'),
        Node(2, 'Title'),
        Node(3, 'Subtitle'),
        Node(4, 'Content'),
        Node(3, 'Table(3,3)666;这是个表格░标题1░@░▓甲░很长很长很长很长很长很长很长░？░▓这是个表格░标题2░@░▓'),
    ]
    node_list = parser_text2internal(mixed_text)

    print(parser_internal2text(node_list))
