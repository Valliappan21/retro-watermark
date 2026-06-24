#import <React/RCTViewManager.h>
#import "RNWatermarkView.h"

@interface RNWatermarkViewManager : RCTViewManager
@end

@implementation RNWatermarkViewManager

RCT_EXPORT_MODULE(RNWatermarkView)

- (UIView *)view
{
  return [RNWatermarkView new];
}

RCT_EXPORT_VIEW_PROPERTY(text, NSString)
RCT_EXPORT_VIEW_PROPERTY(rows, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(columns, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(rotation, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(repeat, BOOL)
RCT_EXPORT_VIEW_PROPERTY(textColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(textSize, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(textOpacity, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(textBold, BOOL)

@end
