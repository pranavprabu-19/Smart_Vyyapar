
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

async function test() {
    try {
        console.log("Starting PDF gen...");
        const doc = new jsPDF();
        doc.text("Hello Node", 10, 10);

        // Test Table
        (autoTable as any)(doc, {
            head: [['ID', 'Name']],
            body: [['1', 'Test']]
        });

        const output = doc.output('arraybuffer');
        console.log("PDF Generated, size:", output.byteLength);
    } catch (e) {
        console.error("Failed:", e);
    }
}

test();
