import pathlib

# Fix ChartContainer require
p = pathlib.Path(r'C:\Users\Mohammad\OneDrive\Desktop\X_KA_HASH-main\frontend\src\components\ChartContainer.tsx')
content = p.read_text(encoding='utf-8')
content = content.replace(
    "const { AreaSeries } = require('lightweight-charts')",
    "const { AreaSeries } = await import('lightweight-charts')"
)
p.write_text(content, encoding='utf-8')
print('ChartContainer fixed')

# Fix CorrelationHeatmap plotly import
p = pathlib.Path(r'C:\Users\Mohammad\OneDrive\Desktop\X_KA_HASH-main\frontend\src\components\CorrelationHeatmap.tsx')
content = p.read_text(encoding='utf-8')
content = content.replace(
    "import('plotly.js-dist-min').then((mod) => {",
    "import('plotly.js-dist-min' as string).then((mod: any) => {"
)
p.write_text(content, encoding='utf-8')
print('CorrelationHeatmap fixed')

# Fix ErrorBoundary process.env
p = pathlib.Path(r'C:\Users\Mohammad\OneDrive\Desktop\X_KA_HASH-main\frontend\src\components\ErrorBoundary.tsx')
content = p.read_text(encoding='utf-8')
content = content.replace(
    "process.env.NODE_ENV === 'development'",
    "(import.meta as any).env.DEV"
)
p.write_text(content, encoding='utf-8')
print('ErrorBoundary fixed')

# Fix WebGLCandleRenderer candleAreaHeight
p = pathlib.Path(r'C:\Users\Mohammad\OneDrive\Desktop\X_KA_HASH-main\frontend\src\components\chart\webgl\WebGLCandleRenderer.ts')
content = p.read_text(encoding='utf-8')
if 'candleAreaHeight' in content and 'const candleAreaHeight' not in content:
    # Check if there's a candleAreaBottom defined above and derive height
    content = content.replace(
        "const volBarHeight = c.volumeHeight * candleAreaHeight",
        "const volBarHeight = c.volumeHeight * (candleAreaBottom || 0)"
    )
    p.write_text(content, encoding='utf-8')
    print('WebGLCandleRenderer fixed')
else:
    print('WebGLCandleRenderer already OK')
