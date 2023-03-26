from PySide6.QtWidgets import QApplication, QMainWindow, QPlainTextEdit, QFileDialog
from PySide6.QtGui import QTextCursor
from GUI import Ui_MainWindow
from core import format


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super(MainWindow, self).__init__()
        self.ui = Ui_MainWindow()
        self.ui.setupUi(self)
        self.ui.Slider.setValue(200)
        self.ui.horizontalSlider.setValue(16)
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

    def setfont(self):
        font = self.ui.fontComboBox.currentFont()
        font.setPointSize(self.ui.horizontalSlider.value())
        self.ui.plainTextEdit.setFont(font)

    def getchange(self):
        self.ui.maxlength.setText(str(self.ui.Slider.value()))

    def format(self):
        text = self.ui.plainTextEdit.toPlainText()
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
        except Exception as E:
            self.ui.lineEdit.setText(str(E))
    
    def Open(self):
        PATH, _ = QFileDialog.getOpenFileName(
            self,
            '打开',
            "E:\myfiles\总结梳理",
            "文本文件 (*.zpb *.txt)")
        try:
            file = open(PATH, encoding='UTF-8')
            text = file.read()
        except UnicodeDecodeError:
            file = open(PATH, encoding='ANSI')
            text = file.read()
        file.close()
        self.ui.plainTextEdit.textChanged.disconnect(self.format)
        self.ui.plainTextEdit.setPlainText(format(text)[0])
        self.ui.plainTextEdit.textChanged.connect(self.format)

    def Save(self):
        text = self.ui.plainTextEdit.toPlainText()
        try:
            PATH, _ = QFileDialog.getSaveFileName(
                self,
                "保存",
                "E:\\myfiles\\总结梳理",
                "文本文件 (*.zpb)")
            with open(PATH, 'w', encoding='UTF-8') as file:
                file.write(format(text, 200)[0])
        except Exception as E:
            self.ui.lineEdit.setText(str(E) + ' !Save Error!')


if __name__ == '__main__':
    app = QApplication([])
    main_window = MainWindow()
    main_window.show()
    app.exec()
