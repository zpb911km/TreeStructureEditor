from typing import NamedTuple


class Node(NamedTuple):
    level: int
    content: str


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


def parser_internal2tree(nodes: list[Node], maxlength: int = None) -> list[str]:
    '''
    Transform the internal data to tree structure data.

    Args:
        nodes (list[Node]): list of tuple(level:int, content:str), also 'the internal data'
        maxlength (int): the limit of the max mumber of characters of each line

    Raises:
        Exception: Too short!
            when a line cannot contain any information(content)

    returns:
        str: specified tree structure data
    '''
    prefix: list = ['  ├─', '  └─', '  │ ', '    ']
    prefix_list: list = []
    for node in nodes:
        line_prifix: list = []
        for i in range(node.level-1):
            line_prifix.append(3)
        prefix_list.append(line_prifix)
    for Anum, Anode in enumerate(nodes):
        if Anode.level == 1:
            continue
        for Bnum, Bnode in enumerate(nodes):
            if Bnum <= Anum:
                continue
            if Anode.level > Bnode.level:
                prefix_list[Anum][Anode.level - 2] = 1
                break
            elif Anode.level == Bnode.level:
                prefix_list[Anum][Anode.level - 2] = 0
                for i in range(Anum+1, Bnum):
                    prefix_list[i][Anode.level - 2] = 2
                break
            else:
                prefix_list[Anum][Anode.level - 2] = 1
            continue
    prefix_list[Anum][Anode.level - 2] = 1
    out_text: str = ''
    if maxlength is None:
        for num, node in enumerate(nodes):
            for style in prefix_list[num]:
                out_text += prefix[style]
            out_text += node.content + '\n'
        return out_text[:-1].split('\n')
    for num, node in enumerate(nodes):
        if len(prefix_list[num]) * len(prefix[3]) >= maxlength:
            raise Exception('Too short!')
        if len(prefix_list[num]) * len(prefix[3]) + len(node.content) <= maxlength:
            for style in prefix_list[num]:
                out_text += prefix[style]
            out_text += node.content + '\n'
        else:
            length = maxlength - len(prefix_list[num]) * len(prefix[3])
            for tnum, text in enumerate([node.content[i:i+length] for i in range(0, len(node.content), length)]):
                if tnum == 0:
                    for style in prefix_list[num]:
                        out_text += prefix[style]
                    out_text += text + '\n'
                else:
                    for style in prefix_list[num]:
                        out_text += prefix[style]
                    out_text = out_text[:-4]
                    out_text += prefix[3] + text + '\n'
    return out_text[:-1].split('\n')


t = parser_internal2tree(node_list)
for i in t:
    print(i)
