from typing import TypeAlias

StrTreeElement: TypeAlias = str | list['StrTreeElement']
StrTrunk: TypeAlias = list[StrTreeElement]

data: StrTrunk = [
    '生物知识纲目',
        ['技术&方法',
            ['传统发酵技术',
                ['酿酒技术']
            ],
            ['微生物培养技术',
                ['无菌技术',
                 '纯培养技术'
                ]
            ],
            '微生物种群高通量筛选',
            '植物组织培养',
            '植物体细胞杂交技术',
            '动物细胞培养技术',
            ['动物细胞融合技术',
                ['杂交瘤技术（两次筛选）',
                    ['单克隆抗体']
                ]
            ]
        ]
]


def p(tree: StrTrunk, indentation: int) -> None:
    global a
    for index, content in enumerate(tree):
        if isinstance(content, str):
            f(indentation)
            if index + 1 == len(tree) or isinstance(tree[index + 1], list):
                print('  └─' + content)
            else:
                print('  ├─' + content)
        else:
            a <<= 1
            a += 1
            p(content, indentation + 1)


a: int = 0


def f(c: int):
    global a
    b = a
    while c:
        if b & 1:
            print('  │ ', end='')
        else:
            print('    ', end='')
        b >> 1
        c -= 1


if __name__ == '__main__':
    p(data, 0)
