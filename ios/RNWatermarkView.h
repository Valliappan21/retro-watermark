#import <UIKit/UIKit.h>

@interface RNWatermarkView : UIView

@property (nonatomic, copy) NSString *text;
@property (nonatomic, assign) NSInteger rows;
@property (nonatomic, assign) NSInteger columns;
@property (nonatomic, assign) CGFloat rotation;
@property (nonatomic, assign) BOOL repeat;
@property (nonatomic, strong) UIColor *textColor;
@property (nonatomic, assign) CGFloat textSize;
@property (nonatomic, assign) CGFloat textOpacity;
@property (nonatomic, assign) BOOL textBold;

@end
