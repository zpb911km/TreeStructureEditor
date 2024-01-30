from PySide6.QtWidgets import QApplication, QMainWindow, QPlainTextEdit, QFileDialog
from PySide6.QtGui import QTextCursor
from GUI.GUI import Ui_MainWindow
from core import format
from time import time


isInit = 0


def Replace(text):
    rpl = [
        ['?=', '≟'],
        ['--》', '→'],
        ['-->', '→'],
        ['《--', '←'],
        ['<--', '←'],
        ['<->', '↔'],
        ['《-》', '↔'],
        ['*·', '×'],
        ['》', '>'],
        ['《', '<'],
        ['，', ','],
        ['。', '.'],
        ['：', ':'],
        ['；', ';'],
        ['（', '('],
        ['）', ')'],
        ['……', '...'],
        ['、', ','],
        ['！', '!'],
        ['？', '?'],
        ['“', '"'],
        ['”', '"'],
        ['【', '['],
        ['】', ']'],
        ['`', '·'],
        ['<=', '≤'],
        ['>=', '≥']
    ]
    global isInit
    if isInit == 1:
        rpl.append(['\t', '  '])    
    for pair in rpl:
        text = text.replace(pair[0], pair[1])
    return text


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super(MainWindow, self).__init__()
        self.ui = Ui_MainWindow()
        self.ui.setupUi(self)
        self.ui.Slider.setValue(200)
        self.ui.horizontalSlider.setValue(20)
        self.ui.maxlength.setText('200')
        # 禁止自动换行
        self.ui.plainTextEdit.setLineWrapMode(QPlainTextEdit.NoWrap)
        # self.ui.plainTextEdit.blockCountChanged.connect(self.format)
        self.ui.plainTextEdit.textChanged.connect(self.format)
        self.ui.Slider.valueChanged.connect(self.getchange)
        self.ui.Slider.valueChanged.connect(self.format)
        self.ui.Open.clicked.connect(self.Open)
        self.ui.Save.clicked.connect(self.Save)
        self.ui.fontComboBox.currentFontChanged.connect(self.setfont)
        self.ui.horizontalSlider.valueChanged.connect(self.setfont)
        self.LST = time()
        self.count = 0

    def setfont(self):
        font = self.ui.fontComboBox.currentFont()
        font.setPointSize(self.ui.horizontalSlider.value())
        self.ui.plainTextEdit.setFont(font)

    def getchange(self):
        self.ui.maxlength.setText(str(self.ui.Slider.value()))

    def format(self):
        text = Replace(self.ui.plainTextEdit.toPlainText())
        global isInit
        isInit = 1
        try:
            DoneText, RetoEnd = format(text, self.ui.Slider.value())
            Cursor = self.ui.plainTextEdit.textCursor()
            P = Cursor.position()  # 获取光标位置
            self.ui.plainTextEdit.textChanged.disconnect(self.format)
            self.ui.plainTextEdit.setPlainText(DoneText)
            self.ui.plainTextEdit.textChanged.connect(self.format)
            if RetoEnd == 0:
                Cursor.setPosition(P)  # 光标归位
            else:
                Cursor.movePosition(QTextCursor.End)
            self.ui.plainTextEdit.setTextCursor(Cursor)
            self.ui.lineEdit.setText('')
            if time() - self.LST >= 10:
                self.Save()
                self.LST = time()
            else:
                self.ui.lineEdit.setText('')
        except Exception as E:
            self.ui.lineEdit.setText(str(E))

    def Open(self):
        self.PATH, _ = QFileDialog.getOpenFileName(
            self,
            '打开',
            "E:\\Nutstore\\总结梳理",
            "文本文件 (*.zpb *.txt)")
        try:
            file = open(self.PATH, encoding='UTF-8')
            text = file.read()
        except UnicodeDecodeError:
            file = open(self.PATH, encoding='ANSI')
            text = file.read()
        file.close()
        self.count = 1
        try:
            self.ui.plainTextEdit.textChanged.disconnect(self.format)
        except RuntimeError:
            pass
        self.ui.plainTextEdit.setPlainText(format(text)[0])
        self.ui.plainTextEdit.textChanged.connect(self.format)

    def Save(self):
        text = Replace(self.ui.plainTextEdit.toPlainText())
        if self.count == 0:
            try:
                self.PATH, _ = QFileDialog.getSaveFileName(
                    self,
                    "保存",
                    "E:\\Nutstore\\总结梳理",
                    "文本文件 (*.zpb)")
                self.count = 1
                with open(self.PATH, 'w', encoding='UTF-8') as file:
                    file.write(format(text, 200)[0])
                self.ui.lineEdit.setText('Saved!')
            except Exception as E:
                self.ui.lineEdit.setText(str(E) + ' !Save Error!')
        else:
            with open(self.PATH, 'w', encoding='UTF-8') as file:
                file.write(format(text, 200)[0])
            self.ui.lineEdit.setText('Saved!')
            # sleep(0.5)


if __name__ == '__main__':
    app = QApplication([])
    main_window = MainWindow()
    try:
        with open(r'E:\\myfiles\\python\\TreeStructureEditor\\src\\GUI\\style.qss', 'r', encoding='UTF-8') as file:
            style_sheet = file.read()
    except FileNotFoundError:
        style_sheet = ''  # QWidget{color: #eb6;background-color: #013;background-image: url(E:\\myfiles\\python\\symbol.png)}
    main_window.setStyleSheet(style_sheet)
    main_window.show()
    app.exec()
