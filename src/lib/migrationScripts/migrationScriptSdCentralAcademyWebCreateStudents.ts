import { v4 } from "uuid";
import { jsonDataService } from "../../routers/children/jsonDataService.js";
const labels = [
  "Regn. No.",
  "Student Name",
  "Father's Name",
  "Mother's Name",
  "Date of Birth",
  "Class",
  "Section",
];
export const migrationScriptSdCentralAcademyWebCreateStudents = async () => {
  const reportCards = await jsonDataService.findByKeyLike({
    key: "sdCentralAcademyWeb/reportCards/%",
  });
  const students = await Promise.all(
    reportCards.data.map(async (entry) => {
      const reportCard = entry.value as any;
      const studentId = v4();
      reportCard.studentId = studentId;
      await jsonDataService.createOrUpdate({
        key: `sdCentralAcademyWeb/reportCards/${reportCard.id}`,
        value: reportCard,
      });
      const student: any = {
        id: studentId,
      };
      for (let label of labels) {
        student[label] = reportCard[label];
      }
      return student;
    })
  );
  const studentsCreationResult = await jsonDataService.createMany(
    students.map((s) => {
      return {
        key: `sdCentralAcademyWeb/students/${s.id}`,
        value: s,
      };
    })
  );
  console.log("studentsCreationResult.count", studentsCreationResult.count);
};
