import firebase from "firebase/app";

const firebaseConfig = {
	apiKey: "AIzaSyCZMRrLQIxrciGgnAnZKYJU908pNkId9MY",
	authDomain: "ndis-invoice-gen.firebaseapp.com",
	projectId: "ndis-invoice-gen",
	storageBucket: "ndis-invoice-gen.appspot.com",
	messagingSenderId: "1021588790444",
	appId: "1:1021588790444:web:b8b5b02b9e8f3bf833d309",
};

firebase.initializeApp(firebaseConfig);

export default firebase;
