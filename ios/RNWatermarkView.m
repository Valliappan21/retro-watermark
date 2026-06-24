#import "RNWatermarkView.h"

@implementation RNWatermarkView

- (instancetype)initWithFrame:(CGRect)frame
{
  if ((self = [super initWithFrame:frame])) {
    self.backgroundColor = UIColor.clearColor;
    self.userInteractionEnabled = NO;
    _text = @"";
    _rows = 4;
    _columns = 3;
    _rotation = -30;
    _repeat = YES;
    _textColor = UIColor.blackColor;
    _textSize = 14;
    _textOpacity = 0.18;
    _textBold = NO;
  }
  return self;
}

- (void)setText:(NSString *)text { _text = [text copy] ?: @""; [self setNeedsDisplay]; }
- (void)setRows:(NSInteger)rows { _rows = MAX(1, rows); [self setNeedsDisplay]; }
- (void)setColumns:(NSInteger)columns { _columns = MAX(1, columns); [self setNeedsDisplay]; }
- (void)setRotation:(CGFloat)rotation { _rotation = rotation; [self setNeedsDisplay]; }
- (void)setRepeat:(BOOL)repeat { _repeat = repeat; [self setNeedsDisplay]; }
- (void)setTextColor:(UIColor *)textColor { _textColor = textColor ?: UIColor.blackColor; [self setNeedsDisplay]; }
- (void)setTextSize:(CGFloat)textSize { _textSize = MAX(1, textSize); [self setNeedsDisplay]; }
- (void)setTextOpacity:(CGFloat)textOpacity { _textOpacity = MIN(1, MAX(0, textOpacity)); [self setNeedsDisplay]; }
- (void)setTextBold:(BOOL)textBold { _textBold = textBold; [self setNeedsDisplay]; }

- (void)drawRect:(CGRect)rect
{
  if (self.text.length == 0 || CGRectIsEmpty(self.bounds)) return;

  UIFont *font = self.textBold
    ? [UIFont boldSystemFontOfSize:self.textSize]
    : [UIFont systemFontOfSize:self.textSize];
  UIColor *color = [self.textColor colorWithAlphaComponent:self.textOpacity];
  NSDictionary *attributes = @{
    NSFontAttributeName: font,
    NSForegroundColorAttributeName: color,
  };
  CGSize size = [self.text sizeWithAttributes:attributes];

  if (!self.repeat) {
    [self drawTextWithAttributes:attributes
                            size:size
                          center:CGPointMake(CGRectGetMidX(self.bounds), CGRectGetMidY(self.bounds))];
    return;
  }

  CGFloat cellWidth = CGRectGetWidth(self.bounds) / self.columns;
  CGFloat cellHeight = CGRectGetHeight(self.bounds) / self.rows;
  for (NSInteger row = 0; row < self.rows; row += 1) {
    for (NSInteger column = 0; column < self.columns; column += 1) {
      CGPoint center = CGPointMake(
        cellWidth * (column + 0.5),
        cellHeight * (row + 0.5)
      );
      [self drawTextWithAttributes:attributes size:size center:center];
    }
  }
}

- (void)drawTextWithAttributes:(NSDictionary *)attributes
                           size:(CGSize)size
                         center:(CGPoint)center
{
  CGContextRef context = UIGraphicsGetCurrentContext();
  CGContextSaveGState(context);
  CGContextTranslateCTM(context, center.x, center.y);
  CGContextRotateCTM(context, self.rotation * M_PI / 180.0);
  [self.text drawAtPoint:CGPointMake(-size.width / 2, -size.height / 2)
          withAttributes:attributes];
  CGContextRestoreGState(context);
}

@end
