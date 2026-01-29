
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function uploadFile(buffer: Buffer, originalFilename: string = "file.pdf"): Promise<string> {
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // Ensure dir exists
    try {
        await mkdir(uploadDir, { recursive: true });
    } catch (e) {
        // Ignore if exists
    }

    const ext = path.extname(originalFilename);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    await writeFile(filePath, buffer);

    // In production, this would be an S3 URL.
    // For local dev, we return the relative public URL.
    return `/uploads/${uniqueName}`;
}
