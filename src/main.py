from PySide6.QtCore import Qt, QSize, QEventLoop, QTimer
from PySide6.QtGui import QIcon, QFont, QTextCursor
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout, QFileDialog
from qfluentwidgets import CommandBar, Action, setFont, SplashScreen, PlainTextEdit, SpinBox, InfoBar, setTheme, Theme, FluentIcon, InfoBarPosition, MessageBoxBase, SubtitleLabel
from qframelesswindow import AcrylicWindow
from time import time
from core import parser_internal2text, parser_text2internal


isInit = 1


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


class FontMessageBox(MessageBoxBase):
    """ Custom message box """

    def __init__(self, parent=None, size: int = 16):
        super().__init__(parent)
        self.titleLabel = SubtitleLabel('调整字号', self)
        self.spinbox = SpinBox()
        self.spinbox.setValue(size)

        # add widget to view layout
        self.viewLayout.addWidget(self.titleLabel)
        self.viewLayout.addWidget(self.spinbox)

        # change the text of button
        self.yesButton.setText('确定')
        self.cancelButton.setText('取消')

        self.widget.setMinimumWidth(350)


class MainWindow(AcrylicWindow):
    def __init__(self):
        super().__init__()
        self.resize(700, 600)
        setTheme(Theme.DARK)
        self.setStyleSheet('MainWindow{background: rgba(32, 32, 32, 0.7)}')
        self.splashScreen = SplashScreen(QIcon("E:\\myfiles\\python\\symbol\\symbol1.png"), self)
        self.splashScreen.setIconSize(QSize(100, 100))
        self.show()
        loop = QEventLoop(self)
        QTimer.singleShot(1000, loop.quit)
        loop.exec()
        self.splashScreen.finish()
        self.centralwidget = QWidget(self)
        self.verticalLayout = QVBoxLayout(self)
        self.CommandBar = CommandBar(self)
        self.CommandBar.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        self.CommandBar.setMaximumSize(QSize(500, 34))
        setFont(self.CommandBar, 20)
        # self.CommandBar.addAction(Action(QIcon(r"E:\myfiles\python\symbol\symbol1.png"), '', self))
        self.CommandBar.addAction(Action(FluentIcon.FOLDER, 'Open', triggered=self.Open, shortcut='Ctrl+O'))
        self.CommandBar.addAction(Action(FluentIcon.SAVE, 'Save', triggered=self.Save, shortcut='Ctrl+S'))
        # TODO self.CommandBar.addHiddenAction(Action(FluentIcon.FONT, 'Font', triggered=lambda: print('Font')))
        self.CommandBar.addHiddenAction(Action(FluentIcon.FONT_SIZE, 'Font Size', triggered=self.setFontSize))
        self.verticalLayout.addWidget(self.CommandBar, 0)
        self.plainTextEdit = PlainTextEdit(self)
        self.plainTextEdit.setFont(QFont(['Unifont'], 16))
        self.verticalLayout.addWidget(self.plainTextEdit)
        self.plainTextEdit.textChanged.connect(self.format)
        self.count = 0
        self.LST = time()

    def setFontSize(self):
        widget = FontMessageBox(self, self.plainTextEdit.font().pointSize())
        if widget.exec():
            self.plainTextEdit.setFont(QFont(['Unifont'], widget.spinbox.value()))

    def Open(self):
        self.PATH, _ = QFileDialog.getOpenFileName(
            self,
            '打开',
            "E:\\Nutstore\\总结梳理",
            "文本文件 (*.zpb *.txt)")
        if self.PATH == '':
            InfoBar.error(
                title='ERROR!',
                content="Path ???",
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )
            return None
        try:
            file = open(self.PATH, encoding='UTF-8')
            text = file.read()
        except UnicodeDecodeError:
            file = open(self.PATH, encoding='ANSI')
            text = file.read()
        file.close()
        self.count = 1
        try:
            self.plainTextEdit.textChanged.disconnect(self.format)
        except RuntimeError:
            pass
        self.plainTextEdit.setPlainText(text)
        self.plainTextEdit.textChanged.connect(self.format)

    def Save(self):
        text = Replace(self.plainTextEdit.toPlainText())
        if self.count == 0:
            self.PATH, _ = QFileDialog.getSaveFileName(
                self,
                "保存",
                "E:\\Nutstore\\总结梳理",
                "文本文件 (*.zpb)")
            if self.PATH != '':
                with open(self.PATH, 'w', encoding='UTF-8') as file:
                    file.write(format(text))
                self.count = 1
                InfoBar.success(
                    title='Saved!',
                    content="",
                    orient=Qt.Horizontal,
                    isClosable=True,
                    position=InfoBarPosition.TOP,
                    duration=2000,
                    parent=self
                )
            else:
                InfoBar.error(
                    title='ERROR!',
                    content="Path ???",
                    orient=Qt.Horizontal,
                    isClosable=True,
                    position=InfoBarPosition.TOP,
                    duration=2000,
                    parent=self
                )
                self.count = 0
        else:
            with open(self.PATH, 'w', encoding='UTF-8') as file:
                file.write(format(text))
            InfoBar.success(
                title='Saved!',
                content="",
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )

    def format(self):
        text = Replace(self.plainTextEdit.toPlainText())
        global isInit
        isInit = 1
        if text[-1] == '\n':
            end = 1
        else:
            end = 0
        try:
            t = parser_internal2text(parser_text2internal(text))
            Cursor = self.plainTextEdit.textCursor()
            P = Cursor.position()  # 获取光标位置
            self.plainTextEdit.textChanged.disconnect(self.format)
            self.plainTextEdit.setPlainText(t)
            self.plainTextEdit.textChanged.connect(self.format)
            if end == 0:
                Cursor.setPosition(P)  # 光标归位
            else:
                Cursor.movePosition(QTextCursor.End)
            self.plainTextEdit.setTextCursor(Cursor)
            if time() - self.LST >= 10:
                self.Save()
                self.LST = time()
        except Exception as E:
            InfoBar.error(
                title='ERROR!',
                content=str(E),
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )


if __name__ == '__main__':
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec()
