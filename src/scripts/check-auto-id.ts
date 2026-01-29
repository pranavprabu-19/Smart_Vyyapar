
import { createEmployeeAction } from "../actions/employee";

async function main() {
    console.log("Testing Auto-ID Generation...");

    const res1 = await createEmployeeAction({
        name: "Auto User 1",
        employeeId: "", // Empty to trigger auto-gen
        role: "TEST",
        baseSalary: 2000,
        companyName: "Auto Corp",
        phone: "123",
        email: "test1@auto.com"
    });
    console.log("Res 1:", res1);

    const res2 = await createEmployeeAction({
        name: "Auto User 2",
        employeeId: "",
        role: "TEST",
        baseSalary: 2100,
        companyName: "Auto Corp",
        phone: "123",
        email: "test2@auto.com"
    });
    console.log("Res 2:", res2);
}

main();
