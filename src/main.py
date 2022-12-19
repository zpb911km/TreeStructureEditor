import os
import sys

sys.path.append(os.path.split(__file__)[0])

from PySide2.QtWidgets import QApplication, QWidget
from PySide2.QtCore import Slot
from format import func
from Ui_GUI import Ui_MainWindow


class MainWindow(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self.widget_container = Ui_MainWindow()
        self.widget_container.setupUi(self)
        self.widget_container.TransformationButton.clicked.connect(self.transform)

    @Slot()
    def transform(self) -> None:
        self.widget_container.OutputBox.setPlainText(
            func(
                self.widget_container.InputBox.toPlainText().splitlines(),
                100
            )
        )


if __name__ == '__main__':
    app = QApplication(sys.argv)
    main_window = MainWindow()
    main_window.show()
    sys.exit(app.exec_())
