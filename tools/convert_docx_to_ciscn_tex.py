from pathlib import Path
import re

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[1]
DOCX_PATH = ROOT / "0514.docx"
OUT_PATH = ROOT / "CISCNThesis" / "0514.tex"


CN_NUM = "\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341"
ABSTRACT = "\u6458\u8981"
REFERENCES = "\u53c2\u8003\u6587\u732e"

CHAPTER_RE = re.compile(rf"^\u7b2c[{CN_NUM}]+\u7ae0\s*(.+?)\s*$")
NUMBERED_RE = re.compile(r"^(\d+(?:\.\d+)+)\s+(.+?)\s*$")


def latex_escape(text: str) -> str:
    text = text.replace("\r", "")
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
        "<": r"\textless{}",
        ">": r"\textgreater{}",
    }
    return "".join(replacements.get(ch, ch) for ch in text)


def clean_heading_title(title: str) -> str:
    title = title.strip()
    # Word TOC lines sometimes carry a trailing page number.
    title = re.sub(r"\s+\d+$", "", title)
    return title


def iter_block_items(document):
    for child in document.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, document)
        elif child.tag.endswith("}tbl"):
            yield Table(child, document)


def paragraph_has_image(paragraph: Paragraph) -> bool:
    return "blip" in paragraph._p.xml


def make_table(table: Table) -> str:
    rows = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            text = cell.text.strip().replace("\n", r"\newline ")
            cells.append(latex_escape(text) if text else " ")
        rows.append(cells)

    if not rows:
        return ""

    col_count = max(len(row) for row in rows)
    spec = "|" + "|".join([r">{\raggedright\arraybackslash}X"] * col_count) + "|"
    lines = [
        r"\begin{table}[htbp]",
        r"\centering",
        r"\small",
        rf"\begin{{tabularx}}{{\textwidth}}{{{spec}}}",
        r"\hline",
    ]
    for row in rows:
        padded = row + [" "] * (col_count - len(row))
        lines.append(" & ".join(padded) + r" \\ \hline")
    lines.extend([r"\end{tabularx}", r"\end{table}", ""])
    return "\n".join(lines)


def make_image_placeholder(index: int) -> str:
    return "\n".join(
        [
            r"\begin{figure}[htbp]",
            r"\centering",
            rf"% TODO: 插入 Word 原图 {index}，例如：\includegraphics[width=0.85\linewidth]{{figures/image-{index}.png}}",
            rf"\caption{{原文档图片 {index}}}",
            r"\end{figure}",
            "",
        ]
    )


def convert():
    doc = Document(DOCX_PATH)
    lines = [
        r"\documentclass{cumcmthesis}",
        r"\usepackage{url}",
        r"\usepackage{array}",
        r"\usepackage{tabularx}",
        r"\usepackage{longtable}",
        r"\usepackage{float}",
        r"\usepackage{amsmath}",
        r"\numberwithin{equation}{section}",
        r"\numberwithin{figure}{section}",
        r"\numberwithin{table}{section}",
        "",
        r"\titlename{基于本地差分隐私的健康手环数据采集与聚合分析系统}",
        r"\email{}",
        r"\yearinput{2026}",
        r"\monthinput{5}",
        r"\dayinput{15}",
        "",
        r"\begin{document}",
        r"\maketitle",
        r"\newpage",
        r"\tableofcontents",
        r"\newpage",
        "",
    ]

    started = False
    in_abstract = False
    abstract_has_content = False
    in_references = False
    image_index = 0

    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            style_name = block.style.name if block.style is not None else ""
            text = block.text.strip()

            if not started:
                if text == ABSTRACT:
                    started = True
                    in_abstract = True
                    lines.extend([r"\begin{cnabstract}", ""])
                continue

            if style_name.lower().startswith("toc"):
                continue

            if paragraph_has_image(block):
                image_index += 1
                lines.append(make_image_placeholder(image_index))

            if not text:
                continue

            if "\u8bf7\u7b80\u8981\u8bf4\u660e" in text:
                continue

            if text == ABSTRACT:
                continue

            if text == REFERENCES:
                if in_abstract:
                    if not abstract_has_content:
                        lines.append(r"% 摘要内容待补充。")
                    lines.extend(["", r"\end{cnabstract}", r"\cnkeywords{本地差分隐私；健康手环；隐私保护；聚合统计}", r"\newpage", ""])
                    in_abstract = False
                in_references = True
                lines.extend([r"\begin{thebibliography}{99}", ""])
                continue

            chapter_match = CHAPTER_RE.match(text)
            if chapter_match:
                if in_abstract:
                    if not abstract_has_content:
                        lines.append(r"% 摘要内容待补充。")
                    lines.extend(["", r"\end{cnabstract}", r"\cnkeywords{本地差分隐私；健康手环；隐私保护；聚合统计}", r"\newpage", ""])
                    in_abstract = False
                title = latex_escape(clean_heading_title(chapter_match.group(1)))
                lines.extend([rf"\section{{{title}}}", ""])
                continue

            numbered_match = NUMBERED_RE.match(text)
            if numbered_match:
                nums = numbered_match.group(1).split(".")
                title = latex_escape(clean_heading_title(numbered_match.group(2)))
                if len(nums) == 2:
                    cmd = "subsection"
                elif len(nums) == 3:
                    cmd = "subsubsection"
                else:
                    cmd = "paragraph"
                lines.extend([rf"\{cmd}{{{title}}}", ""])
                continue

            if in_references:
                ref_match = re.match(r"^\[(\d+)\]\s*(.+)$", text)
                if ref_match:
                    key = f"ref{ref_match.group(1)}"
                    lines.append(rf"\bibitem{{{key}}}{latex_escape(ref_match.group(2))}")
                else:
                    lines.append(latex_escape(text))
                continue

            paragraph = latex_escape(text)
            lines.extend([paragraph, ""])
            if in_abstract:
                abstract_has_content = True

        elif isinstance(block, Table) and started:
            lines.append(make_table(block))

    if in_abstract:
        if not abstract_has_content:
            lines.append(r"% 摘要内容待补充。")
        lines.extend(["", r"\end{cnabstract}", r"\cnkeywords{本地差分隐私；健康手环；隐私保护；聚合统计}", ""])

    if in_references:
        lines.extend(["", r"\end{thebibliography}", ""])

    lines.extend([r"\end{document}", ""])
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(OUT_PATH)


if __name__ == "__main__":
    convert()
