import pixelmatch from "pixelmatch";

const getImageContainers = () =>
  Array.from<HTMLElement>(
    document.querySelectorAll("[data-qa=bk-file__header]")
  )
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

type Size = Record<"width" | "height", number>;

const getImageSize = (img: HTMLImageElement): Size => ({
  width: img.naturalWidth,
  height: img.naturalHeight,
});

const hasSize = (size: Size) => size.width > 0 && size.height > 0;

const waitForNaturalSize = async (img: HTMLImageElement) =>
  new Promise<Size>((resolve, reject) => {
    const size = getImageSize(img);
    if (hasSize(size)) {
      return resolve(size);
    }

    const interval = setInterval(
      (img: HTMLImageElement) => {
        const size = getImageSize(img);
        if (hasSize(size)) {
          clearInterval(interval);
          return resolve(size);
        }
      },
      200,
      img
    );
  });

const processContainers = () => {
  getImageContainers().forEach(async (container) => {
    const [before, after] = container.querySelectorAll<HTMLImageElement>(
      "[data-testid=image-diff] img"
    );

    if (before.hasAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE)) {
      return;
    }

    before.setAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE, "");

    const [beforeSize, afterSize] = await Promise.all([
      waitForNaturalSize(before),
      waitForNaturalSize(after),
    ]);

    const width = Math.max(beforeSize.width, afterSize.width);
    const height = Math.max(beforeSize.height, afterSize.height);

    const outputImageData = new ImageData(width, height);

    const beforeData = getImageData(before, width, height);
    const afterData = getImageData(after, width, height);

    pixelmatch(
      beforeData,
      afterData,
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
    output.style.width = "calc(100% / 3)";

    output.getContext("2d")?.putImageData(outputImageData, 0, 0);

    container
      .querySelector("[data-testid=image-diff]")
      ?.insertAdjacentElement("afterend", output);

    after.setAttribute(IMAGE_DIFF_PROCESSED_DATA_ATTRIBUTE, "");
  });
};

processContainers();

new MutationObserver(() => {
  processContainers();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
