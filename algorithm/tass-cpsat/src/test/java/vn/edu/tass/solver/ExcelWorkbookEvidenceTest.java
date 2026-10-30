package vn.edu.tass.solver;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import static org.junit.jupiter.api.Assertions.*;

/** Checks the original Excel cells behind the anonymized solver fixtures. */
class ExcelWorkbookEvidenceTest {
    private static final String DIRECTORY_PROPERTY = "tass.excel.dir";

    private static Path sourceDirectory() {
        String value = System.getProperty(DIRECTORY_PROPERTY);
        Assumptions.assumeTrue(value != null && !value.isBlank(),
                "Set -D" + DIRECTORY_PROPERTY + " to check the source workbooks");
        Path directory = Path.of(value);
        assertTrue(Files.isDirectory(directory), "Excel directory does not exist: " + directory);
        return directory;
    }

    @Test void currentYearCellsAndStaleSummaryFormulaMatchFixtures() throws Exception {
        try (Workbook workbook = new Workbook(sourceDirectory().resolve("TỔ VẬT LÝ - PCCM NH26-27.xlsx"))) {
            Document teacherSheet = workbook.sheet(2, "Tổ VẬT LÝ NH 26-27");
            numbers(workbook, teacherSheet,
                    "F7", 8, "H7", 13.2, "J7", 4, "N7", 17.2,
                    "H8", 4, "H10", 5, "H12", 4.2,
                    "F64", 2, "G64", 2, "H64", 4,
                    "U7", 13, "W7", 20.2, "Y7", 4, "AC7", 24.2,
                    "U65", 0, "U71", 1, "U72", 1,
                    "W71", 3, "W72", 3, "W65", 6, "Y65", 4, "AC65", 10,
                    "H31", 23.4, "N31", 23.4, "S31", 19,
                    "W39", 29.2, "AC39", 29.2, "AG39", 19,
                    "H57", 12, "J57", 4, "L57", 4, "N57", 20, "S57", 17,
                    "F10", 4, "G10", 1.25, "F12", 3, "G12", 1.4);
            assertEquals("SUM(U66:U70)", workbook.formula(teacherSheet, "U65"));
            assertEquals("CN", workbook.value(teacherSheet, "D37"));
            assertEquals("A3", workbook.value(teacherSheet, "E8"));
            assertEquals("A5; A6; A8; A9", workbook.value(teacherSheet, "E10"));
            assertEquals("A2; A3; A4", workbook.value(teacherSheet, "E12"));
            assertEquals("A1; A4", workbook.value(teacherSheet, "E64"));
            assertEquals("A3 (CHUYÊN ĐỀ)", workbook.value(teacherSheet, "T71"));
            assertEquals("TH (CHUYÊN ĐỀ)", workbook.value(teacherSheet, "T72"));
            assertEquals("CHUYÊN ĐỀ A1 + A2", workbook.value(teacherSheet, "E79"));
            assertFalse(workbook.value(workbook.sheet(1, "PCCM 2026 _ 2027"), "F5").isBlank());
        }
    }

    @Test void historicalLeaveEvidenceMatchesSource() throws Exception {
        try (Workbook workbook = new Workbook(sourceDirectory().resolve("PCCM 25-26 - TỔ VẬT LÝ - đã điều chỉnh hk2.xlsx"))) {
            Document sheet = workbook.sheet(2, "tổ VẬT LÝ 24-25");
            assertEquals("NGHỈ THAI SẢN", workbook.value(sheet, "E16"));
            numbers(workbook, sheet, "F16", 0, "H16", 0);
        }
    }

    @Test void draftWorkbookIsRecognizedAsSeparateSource() throws Exception {
        try (Workbook workbook = new Workbook(sourceDirectory().resolve("DỰ KIẾN _PCCM 2026_2027 gui TTCM.xlsx"))) {
            numbers(workbook, workbook.sheet(1, "Tổ VẬT LÝ NH 26-27"), "H7", 13.2);
        }
    }

    private static void numbers(Workbook workbook, Document sheet, Object... checks) {
        for (int i = 0; i < checks.length; i += 2) {
            String address = (String) checks[i];
            double expected = ((Number) checks[i + 1]).doubleValue();
            String raw = workbook.value(sheet, address);
            assertFalse(raw.isBlank(), address + " is blank");
            assertEquals(expected, Double.parseDouble(raw), 0.0000001, address);
        }
    }

    private static final class Workbook implements AutoCloseable {
        private final ZipFile zip;
        private final List<String> sharedStrings = new ArrayList<>();
        private final List<String> sheetNames = new ArrayList<>();

        private Workbook(Path path) throws Exception {
            assertTrue(Files.isRegularFile(path), "Missing source workbook: " + path);
            zip = new ZipFile(path.toFile());
            Document strings = readOptional("xl/sharedStrings.xml");
            if (strings != null) {
                NodeList items = strings.getElementsByTagNameNS("*", "si");
                for (int i = 0; i < items.getLength(); i++) {
                    NodeList runs = ((Element) items.item(i)).getElementsByTagNameNS("*", "t");
                    StringBuilder value = new StringBuilder();
                    for (int j = 0; j < runs.getLength(); j++) value.append(runs.item(j).getTextContent());
                    sharedStrings.add(value.toString());
                }
            }
            NodeList sheets = read("xl/workbook.xml").getElementsByTagNameNS("*", "sheet");
            for (int i = 0; i < sheets.getLength(); i++) {
                sheetNames.add(((Element) sheets.item(i)).getAttribute("name"));
            }
        }

        private Document sheet(int oneBasedIndex, String expectedName) throws Exception {
            assertTrue(sheetNames.size() >= oneBasedIndex, "Missing sheet " + oneBasedIndex);
            assertEquals(expectedName, sheetNames.get(oneBasedIndex - 1), "Sheet " + oneBasedIndex);
            return read("xl/worksheets/sheet" + oneBasedIndex + ".xml");
        }

        private String value(Document sheet, String address) {
            Element cell = cell(sheet, address);
            if (cell == null) return "";
            String raw = childText(cell, "v");
            if ("s".equals(cell.getAttribute("t"))) return sharedStrings.get(Integer.parseInt(raw));
            Element inline = child(cell, "is");
            return inline != null ? inline.getTextContent() : raw;
        }

        private String formula(Document sheet, String address) {
            Element cell = cell(sheet, address);
            return cell == null ? "" : childText(cell, "f");
        }

        private static Element cell(Document sheet, String address) {
            NodeList cells = sheet.getElementsByTagNameNS("*", "c");
            for (int i = 0; i < cells.getLength(); i++) {
                Element cell = (Element) cells.item(i);
                if (address.equals(cell.getAttribute("r"))) return cell;
            }
            return null;
        }

        private static Element child(Element parent, String name) {
            NodeList nodes = parent.getElementsByTagNameNS("*", name);
            return nodes.getLength() == 0 ? null : (Element) nodes.item(0);
        }

        private static String childText(Element parent, String name) {
            Element element = child(parent, name);
            return element == null ? "" : element.getTextContent();
        }

        private Document read(String entry) throws Exception {
            Document document = readOptional(entry);
            assertNotNull(document, "Missing XLSX entry: " + entry);
            return document;
        }

        private Document readOptional(String entry) throws Exception {
            ZipEntry member = zip.getEntry(entry);
            if (member == null) return null;
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            try (InputStream input = zip.getInputStream(member)) {
                return factory.newDocumentBuilder().parse(input);
            }
        }

        @Override public void close() throws Exception {
            zip.close();
        }
    }
}
