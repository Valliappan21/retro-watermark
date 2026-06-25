package com.reactnativewatermark

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.net.Uri
import android.widget.ImageView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.io.FileNotFoundException
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

@ReactModule(name = ImageInspectorModule.NAME)
class ImageInspectorModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun inspectLocalImage(
        options: ReadableMap,
        promise: Promise
    ) {
        try {
            val localUri = readRequiredString(options, "localUri")
            if (localUri == null) {
                promise.reject(ERROR_INVALID_URI, "localUri must be a non-empty string")
                return
            }
            val watermarkText = readRequiredString(options, "text")
            if (watermarkText == null) {
                promise.reject(ERROR_INVALID_TEXT, "Watermark text must not be empty")
                return
            }
            val position = if (options.hasKey("position") && !options.isNull("position")) {
                readString(options, "position") ?: run {
                    promise.reject(ERROR_INVALID_POSITION, "position must be a string")
                    return
                }
            } else "top-center"
            val rotateDegree = if (options.hasKey("rotateDegree") && !options.isNull("rotateDegree")) {
                readDouble(options, "rotateDegree") ?: run {
                    promise.reject(ERROR_PROCESSING, "rotateDegree must be a finite number")
                    return
                }
            } else 0.0
            val fontSize = if (options.hasKey("fontSize") && !options.isNull("fontSize")) {
                readDouble(options, "fontSize")?.toFloat()?.takeIf { it > 0f } ?: run {
                    promise.reject(ERROR_PROCESSING, "fontSize must be a finite number greater than 0")
                    return
                }
            } else null
            val colorCode = if (options.hasKey("colorCode") && !options.isNull("colorCode")) {
                readString(options, "colorCode") ?: run {
                    promise.reject(ERROR_INVALID_COLOR, "colorCode must be a string")
                    return
                }
            } else "#FFFFFF"
            val marginsResult = readOptionalMap(options, "margins")
            if (marginsResult.isInvalid) {
                promise.reject(ERROR_INVALID_MARGIN, "margins must be an object")
                return
            }

            if (watermarkText.isBlank()) {
                promise.reject(ERROR_INVALID_TEXT, "Watermark text must not be empty")
                return
            }
            if (position !in SUPPORTED_POSITIONS) {
                promise.reject(ERROR_INVALID_POSITION, "Unsupported watermark position: $position")
                return
            }
            val watermarkColor = try {
                Color.parseColor(colorCode)
            } catch (_: IllegalArgumentException) {
                promise.reject(ERROR_INVALID_COLOR, "Unsupported watermark color: $colorCode")
                return
            }
            val watermarkMargins = readOptionalMargins(marginsResult.value)
            if (watermarkMargins == null) {
                promise.reject(ERROR_INVALID_MARGIN, "Watermark margins must be finite numbers 0 or greater")
                return
            }

            val sourceUri = normalizeUri(localUri)
            val readFailure = validateReadableUri(sourceUri)
            if (readFailure != null) {
                promise.reject(readFailure.code, readFailure.message)
                return
            }

            val sourceBitmap = try {
                openImageStream(sourceUri).use(BitmapFactory::decodeStream)
            } catch (error: SecurityException) {
                promise.reject(
                    ERROR_PERMISSION_DENIED,
                    "Read permission was denied for image URI: $localUri. Ask the user to pick the image again or request photo/storage permission before calling inspectLocalImage.",
                    error
                )
                return
            } catch (error: FileNotFoundException) {
                promise.reject(ERROR_NOT_FOUND, "Image does not exist or is no longer accessible: $localUri", error)
                return
            } catch (error: IOException) {
                promise.reject(ERROR_READ_FAILED, "Unable to read image URI: $localUri", error)
                return
            } catch (error: IllegalArgumentException) {
                promise.reject(ERROR_UNSUPPORTED_URI, error.message, error)
                return
            }
            if (sourceBitmap == null || sourceBitmap.width <= 0 || sourceBitmap.height <= 0) {
                promise.reject(ERROR_INVALID_IMAGE, "Unable to decode image: $localUri")
                return
            }
            val imageWidth = sourceBitmap.width
            val imageHeight = sourceBitmap.height

            val outputBitmap = Bitmap.createBitmap(
                imageWidth,
                imageHeight,
                Bitmap.Config.ARGB_8888
            )
            val outputFile = createOutputFile(sourceUri)

            try {
                val canvas = Canvas(outputBitmap)
                canvas.drawBitmap(sourceBitmap, 0f, 0f, null)
                drawWatermark(
                    canvas,
                    outputBitmap.width,
                    outputBitmap.height,
                    watermarkText,
                    position,
                    rotateDegree.toFloat(),
                    fontSize,
                    watermarkColor,
                    watermarkMargins
                )

                val format = if (outputFile.extension.equals("png", ignoreCase = true)) {
                    Bitmap.CompressFormat.PNG
                } else {
                    Bitmap.CompressFormat.JPEG
                }
                FileOutputStream(outputFile).use { output ->
                    if (!outputBitmap.compress(format, 95, output)) {
                        throw IllegalStateException("Bitmap compression failed")
                    }
                }
            } catch (error: Exception) {
                outputFile.delete()
                throw error
            } finally {
                sourceBitmap.recycle()
                outputBitmap.recycle()
            }

            val finalUri = Uri.fromFile(outputFile)
            val result = Arguments.createMap().apply {
                putString("uri", finalUri.toString())
                putString("sourceUri", sourceUri.toString())
                putString("fileName", outputFile.name)
                putInt("width", imageWidth)
                putInt("height", imageHeight)
            }

            UiThreadUtil.runOnUiThread {
                try {
                    // The native ImageView is intentionally created without attaching it.
                    val imageView = ImageView(reactContext)
                    imageView.setImageURI(finalUri)
                    promise.resolve(result)
                } catch (error: Exception) {
                    promise.reject(ERROR_IMAGE_VIEW, "Unable to create final ImageView", error)
                }
            }
        } catch (error: Exception) {
            promise.reject(ERROR_PROCESSING, "Unable to create watermarked image", error)
        }
    }

    private fun drawWatermark(
        canvas: Canvas,
        imageWidth: Int,
        imageHeight: Int,
        text: String,
        position: String,
        rotateDegree: Float,
        fontSize: Float?,
        color: Int,
        margins: WatermarkMargins
    ) {
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            textAlign = Paint.Align.LEFT
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textSize = fontSize ?: min(imageWidth, imageHeight) * 0.07f
        }

        val maximumTextWidth = imageWidth.toFloat().coerceAtLeast(1f)
        val measuredWidth = paint.measureText(text)
        if (measuredWidth > maximumTextWidth) {
            paint.textSize *= maximumTextWidth / measuredWidth
        }

        var textWidth = paint.measureText(text)
        val bounds = Rect()
        paint.getTextBounds(text, 0, text.length, bounds)
        var textHeight = bounds.height().toFloat().coerceAtLeast(1f)
        val radians = Math.toRadians(rotateDegree.toDouble())
        val rotatedWidth = (
            abs(textWidth.toDouble() * cos(radians)) +
                abs(textHeight.toDouble() * sin(radians))
        ).toFloat()
        val rotatedHeight = (
            abs(textWidth.toDouble() * sin(radians)) +
                abs(textHeight.toDouble() * cos(radians))
        ).toFloat()
        val rotatedScale = min(
            1f,
            min(
                imageWidth.toFloat() / rotatedWidth.coerceAtLeast(1f),
                imageHeight.toFloat() / rotatedHeight.coerceAtLeast(1f)
            )
        )
        if (rotatedScale < 1f) {
            paint.textSize *= rotatedScale
            textWidth = paint.measureText(text)
            paint.getTextBounds(text, 0, text.length, bounds)
            textHeight = bounds.height().toFloat().coerceAtLeast(1f)
        }
        val horizontal = position.substringAfterLast('-')
        val vertical = position.substringBefore('-').let {
            if (position == "center") "center" else it
        }

        // Margins are intentionally applied before rotation. The text is first
        // positioned as a normal, unrotated text box, then the canvas rotates
        // around that anchored center point.
        val maximumLeft = (imageWidth.toFloat() - textWidth).coerceAtLeast(0f)
        val boxLeft = when (horizontal) {
            "left" -> margins.left
            "right" -> imageWidth.toFloat() - textWidth - margins.right
            else -> (imageWidth.toFloat() - textWidth) / 2f + margins.left - margins.right
        }.coerceIn(0f, maximumLeft)
        val maximumTop = (imageHeight.toFloat() - textHeight).coerceAtLeast(0f)
        val boxTop = when (vertical) {
            "top" -> margins.top
            "bottom" -> imageHeight.toFloat() - textHeight - margins.bottom
            else -> (imageHeight.toFloat() - textHeight) / 2f + margins.top - margins.bottom
        }.coerceIn(0f, maximumTop)
        val centerX = boxLeft + textWidth / 2f
        val textCenterY = boxTop + textHeight / 2f
        val drawX = boxLeft - bounds.left
        val baseline = boxTop - bounds.top

        canvas.save()
        canvas.rotate(rotateDegree, centerX, textCenterY)
        canvas.drawText(text, drawX, baseline, paint)
        canvas.restore()
    }

    private fun readMargins(margins: ReadableMap): WatermarkMargins? {
        fun read(direction: String): Float {
            return if (margins.hasKey(direction) && !margins.isNull(direction)) {
                margins.getDouble(direction).toFloat()
            } else {
                0f
            }
        }

        return try {
            val result = WatermarkMargins(
                top = read("top"),
                right = read("right"),
                bottom = read("bottom"),
                left = read("left")
            )
            if (listOf(result.top, result.right, result.bottom, result.left).all {
                    it.isFinite() && it >= 0f
                }
            ) result else null
        } catch (_: Exception) {
            null
        }
    }

    private fun readOptionalMargins(margins: ReadableMap?): WatermarkMargins? {
        return if (margins == null) {
            WatermarkMargins(top = 0f, right = 0f, bottom = 0f, left = 0f)
        } else {
            readMargins(margins)
        }
    }

    private fun readRequiredString(options: ReadableMap, key: String): String? {
        return try {
            if (!options.hasKey(key) || options.isNull(key)) {
                null
            } else {
                options.getString(key)?.trim()?.takeIf { it.isNotEmpty() }
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun readString(options: ReadableMap, key: String): String? {
        return try {
            if (!options.hasKey(key) || options.isNull(key)) null else options.getString(key)
        } catch (_: Exception) {
            null
        }
    }

    private fun readDouble(options: ReadableMap, key: String): Double? {
        return try {
            if (!options.hasKey(key) || options.isNull(key)) {
                null
            } else {
                options.getDouble(key).takeIf { it.isFinite() }
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun readOptionalMap(options: ReadableMap, key: String): OptionalMapResult {
        return try {
            OptionalMapResult(
                value = if (!options.hasKey(key) || options.isNull(key)) null else options.getMap(key),
                isInvalid = false
            )
        } catch (_: Exception) {
            OptionalMapResult(value = null, isInvalid = true)
        }
    }

    private fun createOutputFile(sourceUri: Uri): File {
        val sourceFile = if (sourceUri.scheme == "file") sourceUri.path?.let(::File) else null
        val directory = sourceFile?.parentFile?.takeIf { it.isDirectory && it.canWrite() }
            ?: reactContext.cacheDir
        val sourceName = sourceFile?.nameWithoutExtension?.ifBlank { "image" } ?: "image"
        val extension = if (sourceFile?.extension.equals("png", ignoreCase = true)) "png" else "jpg"
        return File(directory, "${sourceName}_watermarked_${System.currentTimeMillis()}.$extension")
    }

    private fun normalizeUri(value: String): Uri {
        val parsed = Uri.parse(value.trim())
        return if (parsed.scheme.isNullOrEmpty()) Uri.fromFile(File(value.trim())) else parsed
    }

    private fun validateReadableUri(uri: Uri): NativeFailure? {
        return when (uri.scheme) {
            null, "file" -> {
                val path = uri.path
                    ?: return NativeFailure(ERROR_INVALID_URI, "Image file URI does not contain a valid path")
                val file = File(path)
                when {
                    !file.exists() -> NativeFailure(ERROR_NOT_FOUND, "Image file does not exist: $path")
                    !file.isFile -> NativeFailure(ERROR_INVALID_URI, "Image URI is not a file: $path")
                    !file.canRead() -> NativeFailure(
                        ERROR_PERMISSION_DENIED,
                        "Read permission was denied for image file: $path. Request photo/storage permission or pass a readable app-owned file URI."
                    )
                    else -> null
                }
            }
            "content" -> try {
                reactContext.contentResolver.openAssetFileDescriptor(uri, "r")?.use { descriptor ->
                    if (descriptor.length == 0L) {
                        NativeFailure(ERROR_INVALID_IMAGE, "Image content URI is empty: $uri")
                    } else {
                        null
                    }
                } ?: NativeFailure(ERROR_NOT_FOUND, "Image content URI could not be opened: $uri")
            } catch (_: SecurityException) {
                NativeFailure(
                    ERROR_PERMISSION_DENIED,
                    "Read permission was denied for image content URI: $uri. Ask the user to pick the image again or request photo/media permission before calling inspectLocalImage."
                )
            } catch (_: FileNotFoundException) {
                NativeFailure(ERROR_NOT_FOUND, "Image content URI does not exist or access expired: $uri")
            } catch (_: IOException) {
                NativeFailure(ERROR_READ_FAILED, "Unable to read image content URI: $uri")
            } catch (_: Exception) {
                NativeFailure(ERROR_READ_FAILED, "Unable to validate image content URI: $uri")
            }
            else -> NativeFailure(
                ERROR_UNSUPPORTED_URI,
                "Unsupported image URI scheme: ${uri.scheme}. Only local file:// and content:// URIs are supported."
            )
        }
    }

    private fun openImageStream(uri: Uri): InputStream {
        return when (uri.scheme) {
            null, "file" -> FileInputStream(File(requireNotNull(uri.path)))
            "content" -> requireNotNull(reactContext.contentResolver.openInputStream(uri)) {
                "Unable to open content URI"
            }
            else -> throw IllegalArgumentException("Only local file:// and content:// URIs are supported")
        }
    }

    companion object {
        const val NAME = "RNImageInspector"
        private val SUPPORTED_POSITIONS = setOf(
            "top-left", "top-center", "top-right",
            "center-left", "center", "center-right",
            "bottom-left", "bottom-center", "bottom-right"
        )
        private const val ERROR_NOT_FOUND = "E_IMAGE_NOT_FOUND"
        private const val ERROR_INVALID_URI = "E_INVALID_URI"
        private const val ERROR_UNSUPPORTED_URI = "E_UNSUPPORTED_URI"
        private const val ERROR_PERMISSION_DENIED = "E_PERMISSION_DENIED"
        private const val ERROR_READ_FAILED = "E_IMAGE_READ_FAILED"
        private const val ERROR_INVALID_TEXT = "E_INVALID_TEXT"
        private const val ERROR_INVALID_POSITION = "E_INVALID_POSITION"
        private const val ERROR_INVALID_COLOR = "E_INVALID_COLOR"
        private const val ERROR_INVALID_MARGIN = "E_INVALID_MARGIN"
        private const val ERROR_INVALID_IMAGE = "E_INVALID_IMAGE"
        private const val ERROR_IMAGE_VIEW = "E_IMAGE_VIEW"
        private const val ERROR_PROCESSING = "E_IMAGE_PROCESSING"
    }

    private data class WatermarkMargins(
        val top: Float,
        val right: Float,
        val bottom: Float,
        val left: Float
    )

    private data class OptionalMapResult(
        val value: ReadableMap?,
        val isInvalid: Boolean
    )

    private data class NativeFailure(
        val code: String,
        val message: String
    )
}
