import pixelmatch from "pixelmatch";

const getImageContainers = (): Array<HTMLElement> =>
  Array.from(document.querySelectorAll("[data-qa=bk-file__header]"))
    .map((element) => {
      const path = element.querySelector("[data-qa=bk-filepath]")?.textContent;
      if (!path?.endsWith(".png")) {
        return;
      }

      return element.parentNode?.querySelector("[data-qa=bk-file__content");
    })
    .filter(Boolean);

const IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE = "data-image-diff-processed";

const getImageData = (
  image: HTMLImageElement,
  width: number,
  height: number
) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No canvas context");
  }

  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, width, height).data;
};

const processContainers = () => {
  getImageContainers().forEach((container) => {
    if (container.hasAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE)) {
      return;
    }

    container.setAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE, "");

    const [before, after] = container.querySelectorAll<HTMLImageElement>(
      "[data-testid=image-diff] img"
    );

    before.addEventListener("load", () => {
      after.addEventListener("load", () => {
        const width = Math.max(before.naturalWidth, after.naturalWidth);
        const height = Math.max(before.naturalHeight, after.naturalHeight);

        const outputImageData = new ImageData(width, height);

        pixelmatch(
          getImageData(before, width, height),
          getImageData(after, width, height),
          outputImageData.data,
          outputImageData.width,
          outputImageData.height,
          {
            threshold: 0.1,
          }
        );

        const output = document.createElement("canvas");
        after.parentElement?.appendChild(output);
        output.width = width;
        output.height = height;
        output.style.width = "100%";
        output.style.maxWidth = "calc(100% / 3)";

        output.getContext("2d")?.putImageData(outputImageData, 0, 0);

        container
          .querySelector("[data-testid=image-diff]")
          ?.insertAdjacentElement("afterend", output);
      });
    });
  });
};

processContainers();

new MutationObserver(() => {
  processContainers();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
