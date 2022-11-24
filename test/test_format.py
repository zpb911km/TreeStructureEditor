import unittest

from src.format import func


class TestFormat(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.maxDiff = None

    def test_format_1(self) -> None:
        with open('test/text/0.txt', 'r', encoding='UTF-8') as file_0:
            origin: list[str] = file_0.read().splitlines()

        with open('test/text/0&30.txt', 'r', encoding='UTF-8') as file_0_30:
            self.assertEqual(func(origin, 30), file_0_30.read())

    def test_format_2(self) -> None:
        with open('test/text/1.txt', 'r', encoding='UTF-8') as file_1:
            origin: list[str] = file_1.read().splitlines()

        with open('test/text/1&50.txt', 'r', encoding='UTF-8') as file_1_50:
            self.assertEqual(func(origin, 50), file_1_50.read())

    def test_format_3(self) -> None:
        with open('test/text/2.txt', 'r', encoding='UTF-8') as file_2:
            origin: list[str] = file_2.read().splitlines()

        with open('test/text/2&30.txt', 'r', encoding='UTF-8') as file_2_30:
            self.assertEqual(func(origin, 30), file_2_30.read())
