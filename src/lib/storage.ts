
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type UploadFileOptions = {
    /** Use a stable filename (e.g. tied to invoice id) instead of a random UUID. */
    deterministicName?: string;
};

export async function uploadFile(
    buffer: Buffer,
    originalFilename: string = "file.pdf",
    opts?: UploadFileOptions
): Promise<string> {
    const uploadDir = process.env.UPLOAD_DIR
        ? path.resolve(process.env.UPLOAD_DIR)
        : path.join(process.cwd(), "public", "uploads");

    // Ensure dir exists
    try {
        await mkdir(uploadDir, { recursive: true });
    } catch (e) {
        // Ignore if exists
    }

    const ext = path.extname(originalFilename) || ".pdf";
    let uniqueName: string;
    if (opts?.deterministicName) {
        const base = opts.deterministicName.replace(/[^\w.-]+/g, "_").slice(0, 120);
        uniqueName = base.toLowerCase().endsWith(ext.toLowerCase()) ? base : `${base}${ext}`;
    } else {
        uniqueName = `${randomUUID()}${ext}`;
    }
    const filePath = path.join(uploadDir, uniqueName);

    await writeFile(filePath, buffer);

    // In production, this would be an S3 URL.
    // For local dev, we return the relative public URL.
    return `/uploads/${uniqueName}`;
}
