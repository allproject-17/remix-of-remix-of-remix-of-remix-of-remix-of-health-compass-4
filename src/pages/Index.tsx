import { Navigate } from "react-router-dom";
const Index = () => <Navigate to="/dashboard" replace />;
export default Index;
// ก๊อปปี้ส่วนนี้ไปวางตอนที่ได้ผลวิเคราะห์มาแล้ว
const newRecord = {
  id: Date.now(),
  date: new Date().toLocaleDateString('th-TH'),
  result: analysis, // ตัวแปรที่เก็บคำวิเคราะห์ AI
  score: "ประเมินแล้ว" 
};
const history = JSON.parse(localStorage.getItem('health_history') || '[]');
localStorage.setItem('health_history', JSON.stringify([newRecord, ...history]));
