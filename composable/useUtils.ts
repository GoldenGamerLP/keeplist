export const useUtils = () => {
  const shortenTextInMiddle = (text: string) => {
    // Shorten the text in the middle, max text length is 10
    const length = text.length;
    const removingFactor = Math.max(0, length - 14) / 2;
    const removeStart = Math.floor(length / 2) - removingFactor;
    const removeEnd = Math.floor(length / 2) + removingFactor;

    return text.substring(0, removeStart) + "..." + text.substring(removeEnd);
  };

  const generateRandomColor = () => {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
  };

  return { shortenTextInMiddle, generateRandomColor };
};
