guideLine = [' ├', ' └', ' │', '  ']  # ['  ├─', '  └─', '  │ ', '    ']
devider = '\t'  # 仅支持\t缩进
follower = '\u200B'  # 用^表示接上一行\u200B


def format(text, maxLength=300):
    RetoEnd = 0
    if text[-1] == '\n':
        text = text[:-1] + '\n' + \
            len(text.split('\n')[-2].split('>', 1)[0])*' ' + '>'
        RetoEnd = 1
    match text[-2:]:
        case '>>':
            text = text[:-2] + guideLine[3] + '>'
            RetoEnd = 1
        case '><':
            text = text[:-(len(guideLine[0])+2)] + '>'
            RetoEnd = 1
        case '>-':
            text1 = ''
            for line in text.split('\n')[:-1]:
                text1 += line + '\n'
            text = text1[:-1]
            RetoEnd = 1
    IndList, TxtList = decode(text)
    PreList = trans(IndList)
    output = ''
    for SrNum in range(len(IndList)):
        Pres = ''
        for Pre in PreList[SrNum]:
            Pres += Pre
        PreLength = len(Pres)
        if PreList[SrNum] == [] or PreList[SrNum][-1] == guideLine[0]:
            Replace = guideLine[2]
        else:
            Replace = guideLine[3]
        output += Pres
        if maxLength - PreLength <= 2:
            raise Exception('Too short!')
        if len('>' + TxtList[SrNum]) <= maxLength - PreLength:
            output += '>' + TxtList[SrNum] + '\n'
        else:
            output += '>' + TxtList[SrNum][:maxLength - PreLength - 1] + '\n'
            TxtList[SrNum] = TxtList[SrNum][maxLength - PreLength - 1:]
            while True:
                if len('>' + TxtList[SrNum]) >= maxLength - PreLength:
                    output += Pres[:-len(guideLine[0])] + Replace + follower + \
                        TxtList[SrNum][:maxLength - PreLength - 1] + '\n'
                    TxtList[SrNum] = TxtList[SrNum][maxLength - PreLength - 1:]
                else:
                    if len(TxtList[SrNum]) == 0:
                        break
                    output += Pres[:-len(guideLine[0])] + \
                        Replace + follower + TxtList[SrNum] + '\n'
                    break
    return output[:-1], RetoEnd


def decode(text):
    IndList = []
    TxtList = []
    for line in text.split('\n'):
        if '>' in line:
            IndList.append(int(len(line.split('>', 1)[0]) / len(guideLine[3])))
            TxtList.append(line.split('>', 1)[-1])
        elif follower in line:
            TxtList[-1] += line.split(follower, 1)[-1]
        else:
            IndList.append(int(len(line.split(devider))-1))
            TxtList.append(line.split(devider)[-1])
    return IndList, TxtList


def trans(IndList):
    PreList = []
    for SrNum in range(len(IndList)):
        PreList.append([guideLine[3]] * IndList[SrNum])
    for SrNum in range(1, len(IndList)):
        for AfNum in range(SrNum + 1, len(IndList)):
            if IndList[AfNum] < IndList[SrNum]:
                PreList[SrNum][IndList[SrNum]-1] = guideLine[1]
                break
            elif IndList[AfNum] == IndList[SrNum]:
                for Num in range(SrNum + 1, AfNum):
                    PreList[Num][IndList[SrNum]-1] = guideLine[2]
                PreList[SrNum][IndList[SrNum]-1] = guideLine[0]
                break
            else:
                PreList[SrNum][IndList[SrNum]-1] = guideLine[1]
    PreList[-1][-1] = guideLine[1]
    return PreList


if __name__ == '__main__':
    print(format('>abcdefghijklmnopqrstuvwxyzabc\n  │ ^defghijklmnopqrstuvwxy\n  ├─>abcdefghijklmnopqrstuvwxy\n  │ ^zabcdefghijklmnopqrstuvwx\n  │ ^y\n  │   └─>abcde\n  ├─>dse\n  │   └─>2\n  ├─>1\n  │   └─>2\n  │       └─>abcdefghijklmnopq\n  │         ^rstuvwxyzabcdefgh\n  │         ^ijklmnopqrstuvwxy\n  └─    >-', 35)[0])
