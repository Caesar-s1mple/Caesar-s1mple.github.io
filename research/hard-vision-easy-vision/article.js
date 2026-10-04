'use strict';

const headings = [...document.querySelectorAll('.art h2[id]')];
const tocLinks = [...document.querySelectorAll('[data-toc]')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting);
    if (!visible.length) return;
    const id = visible[0].target.id;
    tocLinks.forEach(link => {
      const active = link.dataset.toc === id;
      link.classList.toggle('on', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-80px 0px -65% 0px' });
  headings.forEach(heading => observer.observe(heading));
}
document.querySelectorAll('.mobile-toc a').forEach(link => {
  link.addEventListener('click', () => { document.querySelector('.mobile-toc').open = false; });
});

async function enableExplorer() {
  const response = await fetch('assets/scores.json');
  if (!response.ok) throw new Error('Scores unavailable');
  const data = await response.json();
  const capability = document.getElementById('capability');
  const referenceMode = document.getElementById('reference-mode');
  const chart = document.getElementById('bar-chart');
  const format = (value, row) => typeof value === 'number' ? value.toFixed(row.digits) : 'n/s';

  function update() {
    const row = data.rows.find(item => item.id === capability.value);
    const scores = row.scores.filter(value => typeof value === 'number');
    const best = row.lower ? Math.min(...scores) : Math.max(...scores);
    const winner = data.models[row.scores.indexOf(best)];
    const references = [
      row.reference == null ? null : { value: row.reference, label: '模型参考', name: row.reference_name, kind: 'model' },
      row.human == null ? null : { value: row.human, label: '人类参考', name: '基准报告的人类表现', kind: 'human' }
    ].filter(Boolean);
    const mode = referenceMode.value;
    let reference = references.find(item => item.kind === mode);
    if (mode === 'strongest') {
      reference = references.reduce((chosen, item) => {
        if (!chosen) return item;
        return (row.lower ? item.value < chosen.value : item.value > chosen.value) ? item : chosen;
      }, null);
    }
    const ceiling = Math.max(...scores, reference ? reference.value : 0);
    chart.replaceChildren();
    const addBar = (name, value, color) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'bar-row';
      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = name;
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = `bar-fill ${color}`;
      fill.style.width = `${typeof value === 'number' ? value / ceiling * 100 : 0}%`;
      track.append(fill);
      const number = document.createElement('span');
      number.className = 'bar-value';
      number.textContent = format(value, row);
      wrapper.append(label, track, number);
      chart.append(wrapper);
    };
    row.scores.forEach((value, index) => {
      addBar(data.models[index], value, value === best ? 'winner' : index === 0 ? 'astra' : '');
    });
    if (reference) addBar(reference.label, reference.value, 'reference');
    document.getElementById('chart-title').textContent = `${row.zh} · ${row.metric} ${row.lower ? '↓ 越低越好' : '↑ 越高越好'}`;
    document.getElementById('chart-metric').textContent = '条形从 0 开始，按当前任务的最大读数缩放；只比较同一项指标。绿色是六个系统中的最佳值，金色是所选参考。' +
      (row.lower ? ' 这是误差指标，条形越短越好。' : '') +
      (row.id === 'restoration' ? ' PSNR 为对数刻度，长度比例不代表图像质量比例。' : '');
    const referenceText = references.map(item => `${item.label}：${format(item.value, row)}（${item.name}）`).join('；');
    document.getElementById('chart-reference').textContent = referenceText || '该项没有报告模型或人类参考。';
    let summary = `最佳通用系统为 ${winner}（${format(best, row)}）。`;
    if (reference) {
      const gap = row.lower ? reference.value - best : best - reference.value;
      const unit = row.id === 'restoration' ? 'dB' : '个指标单位';
      summary += `与所选${reference.label}相差 ${Math.abs(gap).toFixed(row.digits)} ${unit}，${gap > 0 ? '优于' : gap < 0 ? '低于' : '等于'}参考表现。`;
      if (row.id !== 'restoration') {
        const ratio = (row.lower ? reference.value / best : best / reference.value) * 100;
        summary += `按论文的比值定义为 ${ratio.toFixed(1)}%；它不是“任务解决率”。`;
      }
    } else {
      summary += '没有所选类型的参考，无法计算差距或成熟度。';
    }
    document.getElementById('chart-summary').textContent = summary;
  }
  capability.addEventListener('change', update);
  referenceMode.addEventListener('change', update);
  document.getElementById('chart-controls').hidden = false;
  update();
}
enableExplorer().catch(() => {
  document.getElementById('chart-metric').textContent = '交互数据暂未加载；下方完整成绩表仍可阅读。当前展示视觉识别的静态成绩。';
});
