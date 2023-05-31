import os
PATH = "E:\\myfiles\\总结梳理"
paths = []

for filename in os.listdir(PATH):
    if filename.endswith('zpb'):
        paths.append(os.path.join(PATH, filename))


def decode(PATH, Length):
    olist = []
    raw = ''
    with open(PATH, encoding='UTF-8') as produced:
        plist = produced.read().split('\n')
    if plist[0][0] == '>':
        for line in plist:
            inum = int(len(line.split('>', 1)[0]) / Length)
            try:
                olist.append('\t' * inum + line.split('>', 1)[1])
            except IndexError:
                print('!!')
        for line in olist:
            raw += line + '\n'
        with open(PATH, 'w', encoding='UTF-8') as produced:
            produced.write(raw[:-1])
            produced.close()
    else:
        produced.close()


if __name__ == '__main__':
    decode("E:\myfiles\总结梳理\化学坑点.zpb", 4)
    #for file in paths:
    #    decode(file, 4)  # 1