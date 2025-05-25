// firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDF2nBv8a5YMs6al5Ob_vhMPQC5_E6feFo",
    authDomain: "eltrophy-300c4.firebaseapp.com",
    databaseURL: "https://eltrophy-300c4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "eltrophy-300c4",
    storageBucket: "eltrophy-300c4.firebasestorage.app",
    messagingSenderId: "1074217556700",
    appId: "1:1074217556700:web:4b49dcd397508bc3d4b219",
    measurementId: "G-H9CHG744Q1"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };