import { jsonDataService } from "../../routers/children/jsonDataService.js";

export const examMarksByStudentId = async () => {
  const students = await jsonDataService.findByKeyLike({
    key: "sdCentralAcademyWeb/students/%",
  });
  const studentRegistrationNumberToIdMap: Record<string, string> = {};
  for (const student of students.data) {
    const studentValue = student.value as any;

    studentRegistrationNumberToIdMap[studentValue["Regn. No."]] =
      studentValue.id;
  }
  const examMarksEntry = await jsonDataService.findByKey(
    "sdCentralAcademyWeb/examMarks/2025-2026/QUARTERLY"
  );
  if (examMarksEntry) {
    const examMarks = examMarksEntry.value as any;
    const oldRecords = examMarks.records;
    const newRecords: any = {};
    for (const regNo in oldRecords) {
      const studentId = studentRegistrationNumberToIdMap[regNo];
      if (studentId) {
        newRecords[studentId] = oldRecords[regNo];
      }
    }
    await jsonDataService.createOrUpdate({
      key: "sdCentralAcademyWeb/examMarks/2025-2026/QUARTERLY",
      value: {
        ...examMarks,
        records: newRecords,
      },
    });
  }
};
