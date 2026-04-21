import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
    // Backward compatibility: older records may still be plain text.
    if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
        return bcrypt.compare(inputPassword, storedPassword);
    }
    return storedPassword === inputPassword;
}

export function isHashedPassword(value: string): boolean {
    return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 10) {
        return { valid: false, error: "Password must be at least 10 characters." };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: "Password must include at least one uppercase letter." };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: "Password must include at least one lowercase letter." };
    }
    if (!/\d/.test(password)) {
        return { valid: false, error: "Password must include at least one number." };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return { valid: false, error: "Password must include at least one special character." };
    }
    return { valid: true };
}

export function generateStrongTempPassword(length = 12): string {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const nums = "23456789";
    const specials = "!@#$%^&*";
    const all = upper + lower + nums + specials;

    let out =
        upper[Math.floor(Math.random() * upper.length)] +
        lower[Math.floor(Math.random() * lower.length)] +
        nums[Math.floor(Math.random() * nums.length)] +
        specials[Math.floor(Math.random() * specials.length)];

    for (let i = out.length; i < length; i += 1) {
        out += all[Math.floor(Math.random() * all.length)];
    }
    return out
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");
}

