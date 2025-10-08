describe('krwusdKb', () => {
  test('get krwusd from kb', async () => {
    const html = `
                        <th scope="col" rowspan="3">매매기준율</th>
                        <th scope="col" colspan="2">송금(전신환)</th>
                        <th scope="col" colspan="2">현찰<br><button type="button" class="btn-sub1" name="SPREAD보기">외화현찰 Spread</button></th>
                        <th scope="col" rowspan="3">USD<br/>환산율</th>
                        <th scope="col" rowspan="3" id="goLink">환율변동<br />추이<br />바로가기</th>
                    </tr>
                    <tr>
                        <th scope="col" rowspan="2">보내실 때</th>
                        <th scope="col" rowspan="2">받으실 때</th>
                        <th scope="col" rowspan="2">사실 때</th>
                        <th scope="col" rowspan="2">파실 때</th>
                    </tr>                                           
                </thead>
                <tbody>
                
                                    <tr>
                                <td><a href="#" class="link_direct point_blue" onclick="javascript:uf_goLink('USD'); return false;">USD</a></td>
                                <td class="tLeft"><a href="#" class="link_direct point_blue" onclick="javascript:uf_goLink('USD'); return false;">미국(달러)</a></td>
                                <td class="tRight">1,338.20</td>
                                <td class="tRight">1,351.10</td>
                                <td class="tRight">1,325.30</td>
                                <td class="tRight">1,361.61</td>
                                <td class="tRight">1,314.79</td>
                                <td class="tRight">1.0000</td>
                                <td id="goLinkVal"><a href="#" target="_blank" class="icon-com2 ic7" title="환율 변동추이 바로보기 열림" onclick="javascript:uf_goLink('USD'); return false;">환율 변동추이 바로보기</a></td>
                             </tr>
                        
                                    <tr>
                                <td><a href="#" class="link_direct point_blue" onclick="javascript:uf_goLink('JPY'); return false;">JPY</a></td>
                                <td class="tLeft"><a href="#" class="link_direct point_blue" onclick="javascript:uf_goLink('JPY'); return false;">일본(100엔)</a></td>
                                <td class="tRight">939.68</td>
                                <td class="tRight">948.79</td>
                                <td class="tRight">930.57</td>
                                <td class="tRight">956.12</td>
                                <td class="tRight">923.24</td>
                                <td class="tRight">0.7022</td>
                                <td id="goLinkVal"><a href="#" target="_blank" class="icon-com2 ic7" title="환율 변동추이 바로보기 열림" onclick="javascript:uf_goLink('JPY'); return false;">환율 변동추이 바로보기</a></td>
                             </tr>
                        
                                    <tr>
                                <td><a href="#" class="link_direct point_blue" onclick="javascript:uf_goLink('EUR'); return false;">EUR</a></td>
                                <td class="tLeft"><a href="#" class="link_direct point_blue" onclick="javascript:uf_goLink('EUR'); return false;">유럽연합(유로)</a></td>
                                <td class="tRight">1,483.80</td>
                                <td class="tRight">1,4`

    const result = html.match(
      new RegExp(
        `USD<\/a><\/td>[\n \t].+달러.<\/a><\/td>[\n \t].+td class=\"tRight\">(.+)<\/td>`,
      ),
    )

    expect(result?.[1]).toEqual('1,338.20')
  })
})
