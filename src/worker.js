import { pipeline } from "@xenova/transformers";

/**
 * This class uses the Singleton pattern to ensure that only one instance of the
 * pipeline is loaded. This is because loading the pipeline is an expensive
 * operation and we don't want to do it every time we want to translate a sentence.
 */

// biome-disable-next-line complexity/noStaticOnlyClass
class MyTranslationPipeline {
	static task = "translation";
	static model = "Xenova/nllb-200-distilled-600M";
	static instance = null;

	static async getInstance(progressCallback = null) {
		if (MyTranslationPipeline.instance === null) {
			MyTranslationPipeline.instance = pipeline(
				MyTranslationPipeline.task,
				MyTranslationPipeline.model,
				{ progress_callback: progressCallback },
			);
		}

		return MyTranslationPipeline.instance;
	}
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
	// Retrieve the translation pipeline. When called for the first time,
	// this will load the pipeline and save it for future use.
	const translator = await MyTranslationPipeline.getInstance((x) => {
		// We also add a progress callback to the pipeline so that we can
		// track model loading.
		self.postMessage(x);
	});

	// Actually perform the translation

	console.log(event.data.tgt_lang, event.data.src_lang, "langcode");
	const output = await translator(event.data.text, {
		tgt_lang: event.data.tgt_lang,
		src_lang: event.data.src_lang,

		// Allows for partial output
		callback_function: (x) => {
			self.postMessage({
				status: "update",
				output: translator.tokenizer.decode(x[0].output_token_ids, {
					skip_special_tokens: true,
				}),
			});
		},
	});

	// Send the output back to the main thread
	self.postMessage({
		status: "complete",
		output: output,
	});
});
