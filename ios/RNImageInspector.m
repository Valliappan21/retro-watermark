#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface RNImageInspector : NSObject <RCTBridgeModule>
@end

@implementation RNImageInspector

RCT_EXPORT_MODULE(RNImageInspector)

static NSString *const ERROR_NOT_FOUND = @"E_IMAGE_NOT_FOUND";
static NSString *const ERROR_INVALID_URI = @"E_INVALID_URI";
static NSString *const ERROR_UNSUPPORTED_URI = @"E_UNSUPPORTED_URI";
static NSString *const ERROR_PERMISSION_DENIED = @"E_PERMISSION_DENIED";
static NSString *const ERROR_READ_FAILED = @"E_IMAGE_READ_FAILED";
static NSString *const ERROR_INVALID_TEXT = @"E_INVALID_TEXT";
static NSString *const ERROR_INVALID_POSITION = @"E_INVALID_POSITION";
static NSString *const ERROR_INVALID_COLOR = @"E_INVALID_COLOR";
static NSString *const ERROR_INVALID_MARGIN = @"E_INVALID_MARGIN";
static NSString *const ERROR_INVALID_IMAGE = @"E_INVALID_IMAGE";
static NSString *const ERROR_PROCESSING = @"E_IMAGE_PROCESSING";

static NSSet<NSString *> *SupportedPositions(void)
{
  static NSSet<NSString *> *positions;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    positions = [NSSet setWithArray:@[
      @"top-left", @"top-center", @"top-right",
      @"center-left", @"center", @"center-right",
      @"bottom-left", @"bottom-center", @"bottom-right"
    ]];
  });
  return positions;
}

RCT_REMAP_METHOD(inspectLocalImage,
                 inspectLocalImage:(NSDictionary *)options
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![options isKindOfClass:NSDictionary.class]) {
    reject(ERROR_INVALID_URI, @"options must be an object", nil);
    return;
  }

  NSString *localUri = [self stringValueForKey:@"localUri" inOptions:options defaultValue:nil];
  NSString *watermarkText = [self stringValueForKey:@"text" inOptions:options defaultValue:nil];
  NSString *position = [self stringValueForKey:@"position" inOptions:options defaultValue:@"top-center"];
  NSNumber *rotateDegree = [self numberValueForKey:@"rotateDegree" inOptions:options defaultValue:@0];
  NSNumber *fontSize = [self numberValueForKey:@"fontSize" inOptions:options defaultValue:nil];
  NSString *colorCode = [self stringValueForKey:@"colorCode" inOptions:options defaultValue:@"#FFFFFF"];
  id marginsValue = options[@"margins"];
  if (marginsValue != nil && marginsValue != (id)kCFNull && ![marginsValue isKindOfClass:NSDictionary.class]) {
    reject(ERROR_INVALID_MARGIN, @"margins must be an object", nil);
    return;
  }
  NSDictionary *margins = [marginsValue isKindOfClass:NSDictionary.class] ? marginsValue : @{};

  if (localUri == nil || [localUri stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet].length == 0) {
    reject(ERROR_INVALID_URI, @"localUri must be a non-empty string", nil);
    return;
  }
  localUri = [localUri stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];

  if (watermarkText == nil || [watermarkText stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet].length == 0) {
    reject(ERROR_INVALID_TEXT, @"Watermark text must not be empty", nil);
    return;
  }
  watermarkText = [watermarkText stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];

  if (position == nil || ![SupportedPositions() containsObject:position]) {
    reject(ERROR_INVALID_POSITION, [NSString stringWithFormat:@"Unsupported watermark position: %@", position], nil);
    return;
  }

  UIColor *watermarkColor = [self colorFromHexString:colorCode];
  if (watermarkColor == nil) {
    reject(ERROR_INVALID_COLOR, [NSString stringWithFormat:@"Unsupported watermark color: %@", colorCode], nil);
    return;
  }

  NSDictionary *watermarkMargins = [self normalizedMargins:margins];
  if (watermarkMargins == nil) {
    reject(ERROR_INVALID_MARGIN, @"Watermark margins must be finite numbers 0 or greater", nil);
    return;
  }

  if (rotateDegree == nil || !isfinite(rotateDegree.doubleValue)) {
    reject(ERROR_PROCESSING, @"rotateDegree must be a finite number", nil);
    return;
  }

  if ((options[@"fontSize"] != nil && options[@"fontSize"] != (id)kCFNull) &&
      (fontSize == nil || !isfinite(fontSize.doubleValue) || fontSize.doubleValue <= 0)) {
    reject(ERROR_PROCESSING, @"fontSize must be a finite number greater than 0", nil);
    return;
  }

  NSURL *sourceURL = [self normalizedURL:localUri];
  if (sourceURL == nil) {
    reject(ERROR_INVALID_URI, @"Image URI must be a valid local file URI or path", nil);
    return;
  }

  NSError *accessError = nil;
  if (![self validateReadableURL:sourceURL error:&accessError]) {
    reject(accessError.domain, accessError.localizedDescription, accessError);
    return;
  }

  BOOL securityScoped = [sourceURL startAccessingSecurityScopedResource];
  UIImage *sourceImage = nil;
  NSData *imageData = nil;
  NSError *readError = nil;

  @try {
    imageData = [NSData dataWithContentsOfURL:sourceURL options:NSDataReadingMappedIfSafe error:&readError];
    if (readError != nil) {
      NSString *code = readError.code == NSFileReadNoPermissionError ? ERROR_PERMISSION_DENIED : ERROR_READ_FAILED;
      reject(code, [NSString stringWithFormat:@"Unable to read image URI: %@", localUri], readError);
      return;
    }

    sourceImage = [UIImage imageWithData:imageData];
    if (sourceImage == nil || sourceImage.size.width <= 0 || sourceImage.size.height <= 0 || sourceImage.CGImage == nil) {
      reject(ERROR_INVALID_IMAGE, [NSString stringWithFormat:@"Unable to decode image: %@", localUri], nil);
      return;
    }

    CGSize imageSize = CGSizeMake(CGImageGetWidth(sourceImage.CGImage), CGImageGetHeight(sourceImage.CGImage));
    UIImage *outputImage = [self imageByApplyingWatermarkToImage:sourceImage
                                                       imageSize:imageSize
                                                            text:watermarkText
                                                        position:position
                                                    rotateDegree:rotateDegree.doubleValue
                                                        fontSize:fontSize
                                                           color:watermarkColor
                                                         margins:watermarkMargins];
    if (outputImage == nil) {
      reject(ERROR_PROCESSING, @"Unable to render watermarked image", nil);
      return;
    }

    NSURL *outputURL = [self outputURLForSourceURL:sourceURL];
    NSData *outputData = [self encodedImageData:outputImage sourceURL:sourceURL];
    if (outputData == nil) {
      reject(ERROR_PROCESSING, @"Unable to encode watermarked image", nil);
      return;
    }

    NSError *writeError = nil;
    if (![outputData writeToURL:outputURL options:NSDataWritingAtomic error:&writeError]) {
      NSString *code = writeError.code == NSFileWriteNoPermissionError ? ERROR_PERMISSION_DENIED : ERROR_READ_FAILED;
      reject(code, [NSString stringWithFormat:@"Unable to write watermarked image: %@", outputURL.absoluteString], writeError);
      return;
    }

    // Created intentionally without attaching it, matching the Android ImageView smoke behavior.
    UIImageView *imageView = [[UIImageView alloc] initWithImage:outputImage];
    (void)imageView;

    resolve(@{
      @"uri": outputURL.absoluteString,
      @"sourceUri": sourceURL.absoluteString,
      @"fileName": outputURL.lastPathComponent ?: @"",
      @"width": @((NSInteger)imageSize.width),
      @"height": @((NSInteger)imageSize.height)
    });
  } @catch (NSException *exception) {
    reject(ERROR_PROCESSING, [NSString stringWithFormat:@"Unable to create watermarked image: %@", exception.reason], nil);
  } @finally {
    if (securityScoped) {
      [sourceURL stopAccessingSecurityScopedResource];
    }
  }
}

- (NSString *)stringValueForKey:(NSString *)key inOptions:(NSDictionary *)options defaultValue:(NSString *)defaultValue
{
  id value = options[key];
  if (value == nil || value == (id)kCFNull) {
    return defaultValue;
  }
  if (![value isKindOfClass:NSString.class]) {
    return nil;
  }
  return value;
}

- (NSNumber *)numberValueForKey:(NSString *)key inOptions:(NSDictionary *)options defaultValue:(NSNumber *)defaultValue
{
  id value = options[key];
  if (value == nil || value == (id)kCFNull) {
    return defaultValue;
  }
  if (![value isKindOfClass:NSNumber.class]) {
    return nil;
  }
  return value;
}

- (NSURL *)normalizedURL:(NSString *)value
{
  NSString *trimmed = [value stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
  if (trimmed.length == 0) {
    return nil;
  }

  NSURL *url = [NSURL URLWithString:trimmed];
  if (url.scheme.length == 0) {
    return [NSURL fileURLWithPath:trimmed];
  }
  return url;
}

- (BOOL)validateReadableURL:(NSURL *)url error:(NSError **)error
{
  if (!url.isFileURL) {
    if (error != nil) {
      *error = [NSError errorWithDomain:ERROR_UNSUPPORTED_URI
                                   code:0
                               userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Unsupported image URI scheme: %@. iOS currently supports readable local file:// URIs.", url.scheme ?: @""]}];
    }
    return NO;
  }

  NSString *path = url.path;
  if (path.length == 0) {
    if (error != nil) {
      *error = [NSError errorWithDomain:ERROR_INVALID_URI
                                   code:0
                               userInfo:@{NSLocalizedDescriptionKey: @"Image file URI does not contain a valid path"}];
    }
    return NO;
  }

  NSFileManager *fileManager = NSFileManager.defaultManager;
  BOOL isDirectory = NO;
  if (![fileManager fileExistsAtPath:path isDirectory:&isDirectory]) {
    if (error != nil) {
      *error = [NSError errorWithDomain:ERROR_NOT_FOUND
                                   code:0
                               userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Image file does not exist: %@", path]}];
    }
    return NO;
  }

  if (isDirectory) {
    if (error != nil) {
      *error = [NSError errorWithDomain:ERROR_INVALID_URI
                                   code:0
                               userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Image URI is not a file: %@", path]}];
    }
    return NO;
  }

  if (![fileManager isReadableFileAtPath:path]) {
    if (error != nil) {
      *error = [NSError errorWithDomain:ERROR_PERMISSION_DENIED
                                   code:0
                               userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Read permission was denied for image file: %@. Ask the user to pick the image again or copy it into the app sandbox.", path]}];
    }
    return NO;
  }

  return YES;
}

- (NSDictionary *)normalizedMargins:(NSDictionary *)margins
{
  if (![margins isKindOfClass:NSDictionary.class]) {
    return nil;
  }

  NSMutableDictionary *result = [NSMutableDictionary dictionary];
  for (NSString *direction in @[@"top", @"right", @"bottom", @"left"]) {
    id value = margins[direction] ?: @0;
    if (![value isKindOfClass:NSNumber.class]) {
      return nil;
    }
    double number = [value doubleValue];
    if (!isfinite(number) || number < 0) {
      return nil;
    }
    result[direction] = @(number);
  }
  return result;
}

- (UIColor *)colorFromHexString:(NSString *)hexString
{
  NSString *hex = [[hexString stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet] uppercaseString];
  if ([hex hasPrefix:@"#"]) {
    hex = [hex substringFromIndex:1];
  }

  if (hex.length == 3 || hex.length == 4) {
    NSMutableString *expanded = [NSMutableString string];
    for (NSUInteger index = 0; index < hex.length; index += 1) {
      unichar character = [hex characterAtIndex:index];
      [expanded appendFormat:@"%C%C", character, character];
    }
    hex = expanded;
  }

  if (hex.length != 6 && hex.length != 8) {
    return nil;
  }

  NSScanner *scanner = [NSScanner scannerWithString:hex];
  unsigned long long value = 0;
  if (![scanner scanHexLongLong:&value] || !scanner.isAtEnd) {
    return nil;
  }

  CGFloat alpha = 1.0;
  CGFloat red;
  CGFloat green;
  CGFloat blue;
  if (hex.length == 8) {
    alpha = ((value >> 24) & 0xFF) / 255.0;
    red = ((value >> 16) & 0xFF) / 255.0;
    green = ((value >> 8) & 0xFF) / 255.0;
    blue = (value & 0xFF) / 255.0;
  } else {
    red = ((value >> 16) & 0xFF) / 255.0;
    green = ((value >> 8) & 0xFF) / 255.0;
    blue = (value & 0xFF) / 255.0;
  }
  return [UIColor colorWithRed:red green:green blue:blue alpha:alpha];
}

- (UIImage *)imageByApplyingWatermarkToImage:(UIImage *)image
                                   imageSize:(CGSize)imageSize
                                        text:(NSString *)text
                                    position:(NSString *)position
                                rotateDegree:(CGFloat)rotateDegree
                                    fontSize:(NSNumber *)fontSize
                                       color:(UIColor *)color
                                     margins:(NSDictionary *)margins
{
  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat];
  format.scale = 1;
  format.opaque = NO;

  UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:imageSize format:format];
  return [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
    [image drawInRect:CGRectMake(0, 0, imageSize.width, imageSize.height)];

    CGFloat resolvedFontSize = fontSize == nil ? MIN(imageSize.width, imageSize.height) * 0.07 : fontSize.doubleValue;
    UIFont *font = [UIFont boldSystemFontOfSize:MAX(1, resolvedFontSize)];
    NSDictionary *attributes = @{
      NSFontAttributeName: font,
      NSForegroundColorAttributeName: color
    };
    CGSize textSize = [text sizeWithAttributes:attributes];

    CGFloat radians = rotateDegree * M_PI / 180.0;
    CGFloat rotatedWidth = fabs(textSize.width * cos(radians)) + fabs(textSize.height * sin(radians));
    CGFloat rotatedHeight = fabs(textSize.width * sin(radians)) + fabs(textSize.height * cos(radians));
    CGFloat scale = MIN(1.0, MIN(imageSize.width / MAX(rotatedWidth, 1), imageSize.height / MAX(rotatedHeight, 1)));
    if (scale < 1) {
      font = [UIFont boldSystemFontOfSize:MAX(1, font.pointSize * scale)];
      attributes = @{
        NSFontAttributeName: font,
        NSForegroundColorAttributeName: color
      };
      textSize = [text sizeWithAttributes:attributes];
    }

    NSString *horizontal = [position componentsSeparatedByString:@"-"].lastObject;
    NSString *vertical = [position isEqualToString:@"center"] ? @"center" : [position componentsSeparatedByString:@"-"].firstObject;
    CGFloat top = [margins[@"top"] doubleValue];
    CGFloat right = [margins[@"right"] doubleValue];
    CGFloat bottom = [margins[@"bottom"] doubleValue];
    CGFloat left = [margins[@"left"] doubleValue];

    CGFloat maximumLeft = MAX(imageSize.width - textSize.width, 0);
    CGFloat boxLeft;
    if ([horizontal isEqualToString:@"left"]) {
      boxLeft = left;
    } else if ([horizontal isEqualToString:@"right"]) {
      boxLeft = imageSize.width - textSize.width - right;
    } else {
      boxLeft = (imageSize.width - textSize.width) / 2.0 + left - right;
    }
    boxLeft = MIN(MAX(boxLeft, 0), maximumLeft);

    CGFloat maximumTop = MAX(imageSize.height - textSize.height, 0);
    CGFloat boxTop;
    if ([vertical isEqualToString:@"top"]) {
      boxTop = top;
    } else if ([vertical isEqualToString:@"bottom"]) {
      boxTop = imageSize.height - textSize.height - bottom;
    } else {
      boxTop = (imageSize.height - textSize.height) / 2.0 + top - bottom;
    }
    boxTop = MIN(MAX(boxTop, 0), maximumTop);

    CGPoint center = CGPointMake(boxLeft + textSize.width / 2.0, boxTop + textSize.height / 2.0);
    CGContextRef cgContext = context.CGContext;
    CGContextSaveGState(cgContext);
    CGContextTranslateCTM(cgContext, center.x, center.y);
    CGContextRotateCTM(cgContext, radians);
    [text drawAtPoint:CGPointMake(-textSize.width / 2.0, -textSize.height / 2.0) withAttributes:attributes];
    CGContextRestoreGState(cgContext);
  }];
}

- (NSURL *)outputURLForSourceURL:(NSURL *)sourceURL
{
  NSString *sourcePath = sourceURL.path;
  NSString *directory = sourcePath.stringByDeletingLastPathComponent;
  if (directory.length == 0 || ![NSFileManager.defaultManager isWritableFileAtPath:directory]) {
    directory = NSTemporaryDirectory();
  }

  NSString *sourceName = sourcePath.lastPathComponent.stringByDeletingPathExtension;
  if (sourceName.length == 0) {
    sourceName = @"image";
  }

  NSString *extension = [sourcePath.pathExtension.lowercaseString isEqualToString:@"png"] ? @"png" : @"jpg";
  NSString *fileName = [NSString stringWithFormat:@"%@_watermarked_%lld.%@", sourceName, (long long)(NSDate.date.timeIntervalSince1970 * 1000), extension];
  return [NSURL fileURLWithPath:[directory stringByAppendingPathComponent:fileName]];
}

- (NSData *)encodedImageData:(UIImage *)image sourceURL:(NSURL *)sourceURL
{
  if ([sourceURL.pathExtension.lowercaseString isEqualToString:@"png"]) {
    return UIImagePNGRepresentation(image);
  }
  return UIImageJPEGRepresentation(image, 0.95);
}

@end
