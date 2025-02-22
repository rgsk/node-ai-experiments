import tesseract from "node-tesseract-ocr";
const practice = async () => {
  const imgUrl1 =
    "https://s3.ap-south-1.amazonaws.com/submissions.growthschool.io/68-c96c38c2-5d38-45e0-9b19-5d4f2967a862.jpg";
  const imgUrl2 =
    "https://s3.ap-south-1.amazonaws.com/submissions.growthschool.io/68-2012afb5-cdb8-4dd7-9683-bf44baa2ca05.png";
  const localImg1 = "./t-website.png";
  const localImg2 = "./steve-quote.png";
  tesseract
    .recognize(imgUrl2)
    .then((text) => {
      console.log("Result:", text);
    })
    .catch((error) => {
      console.log(error.message);
    });
};
practice();
