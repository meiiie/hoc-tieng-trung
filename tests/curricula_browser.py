"""Exercise edition choice, self-directed reading and preservation of learning state."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8931/'
ROOT=Path(__file__).resolve().parents[1]
curricula=json.loads((ROOT/'data/curricula.json').read_text(encoding='utf8'))
AXE=(ROOT/'node_modules/axe-core/axe.min.js').read_text(encoding='utf8')

with sync_playwright() as p:
    for kind in ('chromium','webkit'):
        browser=getattr(p,kind).launch()
        context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def audit(name):
            page.add_script_tag(content=AXE)
            violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
            assert not violations,(name,violations)
        page.goto(BASE)
        page.wait_for_function('typeof words!=="undefined" && words.length===12387')
        page.evaluate("""() => {
          S.user={name:'Tự chọn',done:true,goal:'all'};S.set.curriculum='hsk2021';
          S.set.f={};S.srs['爱|ai4']={state:'review',due:4102444800000,s:20,d:4,reps:8,lapses:1};
          S.notes['爱|ai4']='Ghi chú giữ nguyên';S.star['爱|ai4']=true;save();LANG.boot();route();
        }""")
        snapshot=page.evaluate('JSON.stringify([S.srs,S.revlog,S.notes,S.star,S.ev])')
        assert page.evaluate('deck().length')==10969
        page.click('#zh-edition')
        audit('edition chooser')
        page.click('[data-edition="hsk2025"]')
        page.wait_for_function('deck().length===10960')
        page.wait_for_function("document.querySelector('#zh-edition').textContent.includes('2025/2026')")
        assert '2025/2026' in page.text_content('#zh-edition')
        for level in range(1,8):
            page.click(f'[data-zl="{level}"]')
            expected=sum(v==level for v in curricula['editions']['hsk2025']['members'].values())
            assert page.evaluate('deck().length')==expected
            page.click(f'[data-zl="{level}"]')
        assert page.evaluate('JSON.stringify([S.srs,S.revlog,S.notes,S.star,S.ev])')==snapshot
        page.goto(BASE+'#/reader')
        page.wait_for_selector('#zh-text')
        payload='你好，得。<img src=x onerror="window.readerExecuted=true">😀'
        page.fill('#zh-text',payload)
        page.click('#zh-read')
        assert page.text_content('#zh-reading')==payload
        assert page.locator('#zh-reading img').count()==0
        assert not page.evaluate('!!window.readerExecuted')
        audit('reader')
        page.screenshot(path=str(ROOT/f'.cache/reader-{kind}.png'),full_page=True)
        page.get_by_role('button',name='Tra 得',exact=True).click()
        assert page.locator('#sheet .zh-reading-word').count()>=3
        assert 'phải' in page.text_content('#sheet')
        page.keyboard.press('Escape')
        page.fill('#zh-lookup','你好')
        page.locator('#zh-found [data-found]').first.click()
        assert 'xin chào' in page.text_content('#sheet')
        page.keyboard.press('Escape')
        assert page.evaluate('JSON.stringify([S.srs,S.revlog,S.notes,S.star,S.ev])')==snapshot
        page.goto(BASE+'#/guide')
        page.wait_for_selector('.zh-guide')
        assert 'Không cần hoàn thành cấp trước' in page.text_content('.zh-guide')
        assert 'không phải chứng chỉ' in page.text_content('.zh-guide')
        audit('learning guide')
        page.goto(BASE)
        page.wait_for_selector('#zh-edition')
        assert page.evaluate('S.set.curriculum')=='hsk2025'
        assert page.evaluate('deck().length')==10960
        page.click('#zh-edition');page.click('[data-edition="hsk2021"]')
        page.wait_for_function('deck().length===10969')
        assert page.evaluate('JSON.stringify([S.srs,S.revlog,S.notes,S.star,S.ev])')==snapshot
        assert not errors,errors
        print(json.dumps({'browser':kind,'editionSwitchAndReload':True,'everyLevelOpen':True,
                          'polyphonicLookup':True,'literalTextSafe':True,'noAutomaticScheduling':True,
                          'progressAndNotesPreserved':True,'axeViolations':0}))
        context.close();browser.close()
